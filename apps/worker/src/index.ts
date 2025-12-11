import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { db, tracks, sessions, subfingerprints, knownTracks } from '@avine/core';
import { eq, sql, inArray } from 'drizzle-orm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Client } from 'minio';
import fs from 'fs';
import path from 'path';
import os from 'os';
import youtubedl from 'yt-dlp-exec';

const execFileAsync = promisify(execFile);

dotenv.config();

// Resolve paths to binaries
const projectRoot = process.cwd().endsWith('worker') ? path.join(process.cwd(), '../../') : process.cwd();
const ffmpegPath = path.join(projectRoot, 'bin/ffmpeg');
const fpcalcPath = path.join(projectRoot, 'bin/fpcalc');

console.log('Using Binaries at:', projectRoot, 'bin/');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const minioClient = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
});

console.log('Starting Audio Processing Worker (Subfingerprint Mode)...');

interface FpcalcResult {
  duration: number;
  fingerprint: number[];
}

async function fingerprintFile(filePath: string): Promise<FpcalcResult> {
  const { stdout } = await execFileAsync(fpcalcPath, ['-json', '-raw', filePath]);
  return JSON.parse(stdout);
}

interface TrackMatch {
  trackId: string;
  title: string;
  artist: string;
  votes: number;
  offsetDiff: number; // query_offset - db_offset
  startTimeInMix: number;
  endTimeInMix: number;
}

/**
 * Subfingerprint-based audio recognition
 * 
 * Algorithm:
 * 1. Fingerprint the query audio to get hash array
 * 2. Query database for ALL matching hashes
 * 3. For each match, compute offset_diff = query_offset - db_offset
 * 4. Group by (track_id, offset_diff bucket)
 * 5. Track + offset_diff with most votes = match
 */
async function recognizeAudio(filePath: string, duration: number): Promise<TrackMatch[]> {
  console.log(`Recognizing audio: ${filePath} (${duration}s)`);

  // 1. Get fingerprint hashes
  const result = await fingerprintFile(filePath);
  const queryHashes = result.fingerprint.map(h => h >>> 0); // Ensure unsigned
  const timePerHashMs = (result.duration * 1000) / queryHashes.length;

  console.log(`  Query fingerprint: ${queryHashes.length} hashes`);

  // 2. Query database for matching hashes
  // Do this in batches to avoid too-large queries
  const BATCH_SIZE = 500;
  const allMatches: { hash: number; trackId: string; offsetMs: number; queryIdx: number }[] = [];

  for (let i = 0; i < queryHashes.length; i += BATCH_SIZE) {
    const batchHashes = queryHashes.slice(i, i + BATCH_SIZE);
    const batchStartIdx = i;

    // Query for matching hashes
    const matches = await db.select({
      hash: subfingerprints.hash,
      trackId: subfingerprints.trackId,
      offsetMs: subfingerprints.offsetMs,
    })
    .from(subfingerprints)
    .where(inArray(subfingerprints.hash, batchHashes));

    // Map each match back to its query index
    for (const match of matches) {
      // Find which query hash this matches (there may be multiple)
      for (let j = 0; j < batchHashes.length; j++) {
        if (batchHashes[j] === match.hash) {
          allMatches.push({
            hash: match.hash,
            trackId: match.trackId,
            offsetMs: match.offsetMs,
            queryIdx: batchStartIdx + j,
          });
        }
      }
    }
  }

  console.log(`  Found ${allMatches.length} matching hashes in database`);

  if (allMatches.length === 0) {
    return [];
  }

  // 3. Compute offset differences and group by (track_id, offset_diff bucket)
  // offset_diff = query_offset - db_offset
  // Bucket by 500ms for some tolerance
  const BUCKET_MS = 500;

  interface VoteKey {
    trackId: string;
    offsetBucket: number;
  }

  const votes = new Map<string, { votes: number; offsets: number[]; queryIdxs: number[] }>();

  for (const match of allMatches) {
    const queryOffsetMs = Math.round(match.queryIdx * timePerHashMs);
    const offsetDiff = queryOffsetMs - match.offsetMs;
    const bucket = Math.round(offsetDiff / BUCKET_MS) * BUCKET_MS;
    
    const key = `${match.trackId}:${bucket}`;
    const existing = votes.get(key) || { votes: 0, offsets: [], queryIdxs: [] };
    existing.votes++;
    existing.offsets.push(offsetDiff);
    existing.queryIdxs.push(match.queryIdx);
    votes.set(key, existing);
  }

  // 4. Find tracks with significant votes
  // Require at least 8 votes to be considered a match
  const MIN_VOTES = 8;
  
  const candidates: { trackId: string; bucket: number; votes: number; queryIdxs: number[] }[] = [];
  
  for (const [key, data] of votes) {
    if (data.votes >= MIN_VOTES) {
      const [trackId, bucketStr] = key.split(':');
      candidates.push({
        trackId,
        bucket: parseInt(bucketStr),
        votes: data.votes,
        queryIdxs: data.queryIdxs,
      });
    }
  }

  // Sort by votes descending
  candidates.sort((a, b) => b.votes - a.votes);

  console.log(`  Found ${candidates.length} candidate tracks with ${MIN_VOTES}+ votes`);

  if (candidates.length === 0) {
    return [];
  }

  // 5. Get track metadata and compute time ranges
  const trackIds = [...new Set(candidates.map(c => c.trackId))];
  const trackMetadata = await db.select({
    id: knownTracks.id,
    title: knownTracks.title,
    artist: knownTracks.artist,
  })
  .from(knownTracks)
  .where(inArray(knownTracks.id, trackIds));

  const trackMap = new Map(trackMetadata.map(t => [t.id, t]));

  // 6. Group overlapping candidates for the same track
  // and compute final results
  const results: TrackMatch[] = [];

  // Group candidates by track
  const byTrack = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const existing = byTrack.get(c.trackId) || [];
    existing.push(c);
    byTrack.set(c.trackId, existing);
  }

  for (const [trackId, trackCandidates] of byTrack) {
    const meta = trackMap.get(trackId);
    if (!meta) continue;

    // Merge overlapping offset buckets for the same track instance
    // For now, just take the highest-voted bucket per track
    const best = trackCandidates[0];
    
    // Compute time range in mix
    const minQueryIdx = Math.min(...best.queryIdxs);
    const maxQueryIdx = Math.max(...best.queryIdxs);
    const startTimeInMix = (minQueryIdx * timePerHashMs) / 1000;
    const endTimeInMix = (maxQueryIdx * timePerHashMs) / 1000;

    results.push({
      trackId,
      title: meta.title,
      artist: meta.artist,
      votes: best.votes,
      offsetDiff: best.bucket,
      startTimeInMix: Math.floor(startTimeInMix),
      endTimeInMix: Math.ceil(endTimeInMix),
    });
  }

  // Sort by start time
  results.sort((a, b) => a.startTimeInMix - b.startTimeInMix);

  return results;
}

const worker = new Worker('audio-processing', async job => {
  console.log(`Processing job ${job.id}:`, job.data);
  const { sessionId, type } = job.data;

  let localFilePath = '';

  try {
    // Update status to PROCESSING
    await db.update(sessions)
      .set({ status: 'PROCESSING' })
      .where(eq(sessions.id, sessionId));

    const tmpDir = os.tmpdir();

    if (type === 'FILE_UPLOAD') {
      const { fileKey } = job.data;
      localFilePath = path.join(tmpDir, fileKey);
      await minioClient.fGetObject('uploads', fileKey, localFilePath);
      console.log(`Downloaded file to ${localFilePath}`);
    } else if (type === 'URL') {
      const { url } = job.data;
      const outputTemplate = path.join(tmpDir, `${sessionId}.%(ext)s`);
      
      console.log(`Downloading URL: ${url}`);
      
      await youtubedl(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        output: outputTemplate,
        noPlaylist: true,
      });

      localFilePath = path.join(tmpDir, `${sessionId}.mp3`);
      
      if (!fs.existsSync(localFilePath)) {
         throw new Error('Failed to download audio from URL');
      }
      console.log(`Downloaded URL to ${localFilePath}`);
    }

    // Get duration from fingerprint
    const fpResult = await fingerprintFile(localFilePath);
    const duration = fpResult.duration;
    
    console.log(`Analyzing file: ${localFilePath} (${duration}s)`);

    // Recognize tracks using subfingerprint matching
    const identifiedTracks = await recognizeAudio(localFilePath, duration);

    if (identifiedTracks.length === 0) {
      console.log('No tracks detected.');
    } else {
      console.log(`\nDetected ${identifiedTracks.length} tracks:`);
      for (const t of identifiedTracks) {
        // Calculate confidence based on votes (more votes = higher confidence)
        // A full 30s track should have ~200 hashes, so 100+ matches is very confident
        const confidence = Math.min(100, Math.floor(t.votes / 2));
        
        await db.insert(tracks).values({
          sessionId,
          title: t.title,
          artist: t.artist,
          duration: t.endTimeInMix - t.startTimeInMix,
          confidence,
          startTime: t.startTimeInMix,
          endTime: t.endTimeInMix,
        });
        console.log(`  - ${t.artist} - ${t.title}`);
        console.log(`    Time: ${t.startTimeInMix}s - ${t.endTimeInMix}s`);
        console.log(`    Votes: ${t.votes}, Confidence: ${confidence}%`);
      }
    }

    // Update status to COMPLETED
    await db.update(sessions)
      .set({ status: 'COMPLETED', duration: Math.floor(duration) })
      .where(eq(sessions.id, sessionId));

    // Cleanup
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    console.log(`\nJob ${job.id} completed successfully`);
    return { status: 'completed', tracksFound: identifiedTracks.length };

  } catch (error: any) {
    console.error(`Job ${job.id} failed:`, error);
    
    // Update status to FAILED
    await db.update(sessions)
      .set({ status: 'FAILED' })
      .where(eq(sessions.id, sessionId));

    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    throw error;
  }
}, { connection });

worker.on('completed', job => {
  console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
