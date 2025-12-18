/**
 * Scan Mix Routes
 * Complete mix analysis: receive audio URL, fingerprint server-side, match against DB
 */

import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db, subfingerprints, knownTracks } from '@avine/core';
import { inArray, eq } from 'drizzle-orm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import z from 'zod';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);

const BUCKET_MS = 500;
const MIN_VOTES = 5;
const SEGMENT_DURATION_S = 30; // Analyze in 30s chunks

// Resolve path to fpcalc
const projectRoot = process.cwd().endsWith('api') ? path.join(process.cwd(), '../../') : process.cwd();
const fpcalcPath = path.join(projectRoot, 'bin/fpcalc');

interface FpcalcResult {
  duration: number;
  fingerprint: number[];
}

interface TrackMatch {
  title: string;
  artist: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

async function fingerprintFile(filePath: string): Promise<FpcalcResult> {
  const { stdout } = await execFileAsync(fpcalcPath, ['-json', '-raw', filePath]);
  return JSON.parse(stdout);
}

export async function scanMixRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>()
    .post('/scan-mix', {
      schema: {
        body: z.object({
          audioUrl: z.string().url(),
        }),
        response: {
          200: z.object({
            tracks: z.array(z.object({
              title: z.string(),
              artist: z.string(),
              startTime: z.number(),
              endTime: z.number(),
              confidence: z.number()
            })),
            duration: z.number()
          })
        }
      }
    }, async (request, reply) => {
      const { audioUrl } = request.body;
      
      console.log(`[Scan Mix] Starting analysis for: ${audioUrl.substring(0, 100)}...`);
      
      const tempDir = path.join(os.tmpdir(), `avine-scan-${randomUUID()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      const audioPath = path.join(tempDir, 'audio.mp3');
      
      try {
        // Download audio file
        console.log('[Scan Mix] Downloading audio...');
        const response = await fetch(audioUrl);
        if (!response.ok) {
          return reply.status(400).send({ message: 'Failed to download audio' } as any);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(audioPath, Buffer.from(arrayBuffer));
        console.log(`[Scan Mix] Downloaded ${Math.round(arrayBuffer.byteLength / 1024)}KB`);
        
        // Fingerprint with chunking
        console.log('[Scan Mix] Fingerprinting...');
        const result = await fingerprintFile(audioPath);
        const totalDuration = result.duration;
        const queryHashes = result.fingerprint.map(h => h >>> 0);
        const timePerHashMs = (totalDuration * 1000) / queryHashes.length;
        
        console.log(`[Scan Mix] Duration: ${totalDuration}s, ${queryHashes.length} hashes`);
        
        if (queryHashes.length === 0) {
          return { tracks: [], duration: totalDuration };
        }
        
        // Query all matching hashes
        const matches = await db.select({
          hash: subfingerprints.hash,
          trackId: subfingerprints.trackId,
          offsetMs: subfingerprints.offsetMs,
        })
        .from(subfingerprints)
        .where(inArray(subfingerprints.hash, queryHashes));
        
        console.log(`[Scan Mix] Found ${matches.length} hash matches`);
        
        if (matches.length === 0) {
          return { tracks: [], duration: totalDuration };
        }
        
        // Process in segments for better track boundary detection
        const detectedTracks: TrackMatch[] = [];
        const segmentHashes = Math.floor((SEGMENT_DURATION_S * 1000) / timePerHashMs);
        
        for (let segStart = 0; segStart < queryHashes.length; segStart += segmentHashes) {
          const segEnd = Math.min(segStart + segmentHashes, queryHashes.length);
          const segHashes = queryHashes.slice(segStart, segEnd);
          const segStartTime = (segStart * timePerHashMs) / 1000;
          
          // Filter matches for this segment
          const segMatches = matches.filter(m => {
            const idx = queryHashes.indexOf(m.hash);
            return idx >= segStart && idx < segEnd;
          });
          
          if (segMatches.length === 0) continue;
          
          // Temporal voting
          const votes = new Map<string, { votes: number; trackId: string }>();
          
          for (const match of segMatches) {
            const queryIdx = segHashes.indexOf(match.hash);
            if (queryIdx === -1) continue;
            
            const queryOffsetMs = Math.round((segStart + queryIdx) * timePerHashMs);
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
            const [trackMeta] = await db.select({
              title: knownTracks.title,
              artist: knownTracks.artist,
            })
            .from(knownTracks)
            .where(eq(knownTracks.id, bestCandidate.trackId));
            
            if (trackMeta) {
              const confidence = Math.min(100, Math.floor(bestCandidate.votes * 2));
              const segEndTime = segStartTime + SEGMENT_DURATION_S;
              
              // Check if continuation of previous track
              const lastTrack = detectedTracks[detectedTracks.length - 1];
              if (lastTrack && 
                  lastTrack.title === trackMeta.title && 
                  lastTrack.artist === trackMeta.artist &&
                  segStartTime - lastTrack.endTime < SEGMENT_DURATION_S * 0.5) {
                lastTrack.endTime = segEndTime;
                lastTrack.confidence = Math.max(lastTrack.confidence, confidence);
              } else {
                detectedTracks.push({
                  title: trackMeta.title,
                  artist: trackMeta.artist,
                  startTime: segStartTime,
                  endTime: segEndTime,
                  confidence
                });
              }
              
              console.log(`[Scan Mix] Match at ${Math.floor(segStartTime)}s: ${trackMeta.artist} - ${trackMeta.title}`);
            }
          }
        }
        
        console.log(`[Scan Mix] Detected ${detectedTracks.length} tracks`);
        
        return { tracks: detectedTracks, duration: totalDuration };
        
      } finally {
        // Cleanup
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    });
}
