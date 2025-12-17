/**
 * Fingerprint Analysis Routes
 * Receives fingerprints from extension and matches against subfingerprints database
 */

import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db, subfingerprints, knownTracks } from '@avine/core';
import { inArray, eq } from 'drizzle-orm';
import z from 'zod';

const BUCKET_MS = 500; // Offset bucket size for temporal voting
const MIN_VOTES = 5; // Minimum hash matches for detection

interface TrackMatch {
  title: string;
  artist: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export async function fingerprintRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>()
    .post('/analyze-fingerprints', {
      schema: {
        body: z.object({
          segments: z.array(z.object({
            start: z.number(),
            fingerprint: z.array(z.number())
          })),
          duration: z.number(),
          segmentDuration: z.number()
        }),
        response: {
          200: z.object({
            tracks: z.array(z.object({
              title: z.string(),
              artist: z.string(),
              startTime: z.number(),
              endTime: z.number(),
              confidence: z.number()
            }))
          })
        }
      }
    }, async (request) => {
      const { segments, segmentDuration } = request.body;
      
      console.log(`[Fingerprint Analysis] Received ${segments.length} segments`);
      
      const detectedTracks: TrackMatch[] = [];
      
      for (const segment of segments) {
        const { start, fingerprint } = segment;
        
        if (fingerprint.length === 0) continue;
        
        // Convert to unsigned 32-bit integers
        const queryHashes = fingerprint.map(h => h >>> 0);
        const timePerHashMs = (segmentDuration * 1000) / queryHashes.length;
        
        // Query matching hashes from database
        const matches = await db.select({
          hash: subfingerprints.hash,
          trackId: subfingerprints.trackId,
          offsetMs: subfingerprints.offsetMs,
        })
        .from(subfingerprints)
        .where(inArray(subfingerprints.hash, queryHashes));
        
        if (matches.length === 0) {
          console.log(`[Fingerprint] Segment at ${start}s: No hash matches`);
          continue;
        }
        
        console.log(`[Fingerprint] Segment at ${start}s: ${matches.length} hash matches`);
        
        // Group by (track, offset_diff bucket) for temporal voting
        const votes = new Map<string, { votes: number; trackId: string }>();
        
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const queryIdx = queryHashes.indexOf(match.hash);
          if (queryIdx === -1) continue;
          
          const queryOffsetMs = Math.round(queryIdx * timePerHashMs);
          const offsetDiff = queryOffsetMs - match.offsetMs;
          const bucket = Math.round(offsetDiff / BUCKET_MS) * BUCKET_MS;
          
          const key = `${match.trackId}:${bucket}`;
          const existing = votes.get(key) || { votes: 0, trackId: match.trackId };
          existing.votes++;
          votes.set(key, existing);
        }
        
        // Find best candidate
        let bestCandidate: { trackId: string; votes: number } | null = null;
        for (const data of votes.values()) {
          if (data.votes >= MIN_VOTES && (!bestCandidate || data.votes > bestCandidate.votes)) {
            bestCandidate = data;
          }
        }
        
        if (bestCandidate) {
          // Get track metadata
          const [trackMeta] = await db.select({
            title: knownTracks.title,
            artist: knownTracks.artist,
          })
          .from(knownTracks)
          .where(eq(knownTracks.id, bestCandidate.trackId));
          
          if (trackMeta) {
            const confidence = Math.min(100, Math.floor(bestCandidate.votes * 2));
            
            // Check if this is a continuation of the previous track
            const lastTrack = detectedTracks[detectedTracks.length - 1];
            if (lastTrack && 
                lastTrack.title === trackMeta.title && 
                lastTrack.artist === trackMeta.artist &&
                start - lastTrack.endTime < segmentDuration * 1.5) {
              // Extend the previous track
              lastTrack.endTime = start + segmentDuration;
              lastTrack.confidence = Math.max(lastTrack.confidence, confidence);
            } else {
              // New track
              detectedTracks.push({
                title: trackMeta.title,
                artist: trackMeta.artist,
                startTime: start,
                endTime: start + segmentDuration,
                confidence
              });
            }
            
            console.log(`[Fingerprint] Match: ${trackMeta.artist} - ${trackMeta.title} at ${start}s (votes: ${bestCandidate.votes})`);
          }
        }
      }
      
      console.log(`[Fingerprint Analysis] Detected ${detectedTracks.length} tracks`);
      
      return { tracks: detectedTracks };
    });
}
