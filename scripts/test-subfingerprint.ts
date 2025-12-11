/**
 * Test subfingerprint recognition on the mix file
 */
import { execFileSync } from 'child_process';
import { db, subfingerprints, knownTracks } from '@avine/core';
import { inArray } from 'drizzle-orm';
import path from 'path';

const fpcalcPath = path.join(process.cwd(), 'bin/fpcalc');

async function test() {
  const result = JSON.parse(
    execFileSync(fpcalcPath, ['-json', '-raw', 'test_audio/2-5-10-140-141.mp3']).toString()
  );
  const queryHashes = result.fingerprint.map((h: number) => h >>> 0);
  const timePerHashMs = (result.duration * 1000) / queryHashes.length;
  
  console.log('Mix:', queryHashes.length, 'hashes,', result.duration.toFixed(1), 's');
  
  // Query ALL matching hashes
  const BATCH_SIZE = 500;
  const allMatches: any[] = [];
  
  for (let i = 0; i < queryHashes.length; i += BATCH_SIZE) {
    const batch = queryHashes.slice(i, i + BATCH_SIZE);
    const matches = await db.select({
      hash: subfingerprints.hash,
      trackId: subfingerprints.trackId,
      offsetMs: subfingerprints.offsetMs,
    })
    .from(subfingerprints)
    .where(inArray(subfingerprints.hash, batch));
    
    for (const m of matches) {
      for (let j = 0; j < batch.length; j++) {
        if (batch[j] === m.hash) {
          allMatches.push({
            ...m,
            queryIdx: i + j,
            queryOffsetMs: Math.round((i + j) * timePerHashMs),
          });
        }
      }
    }
  }
  
  console.log('Total matching hashes:', allMatches.length);
  
  // Group by (track, offset_diff bucket)
  const BUCKET_MS = 500;
  const votes = new Map<string, { votes: number; queryIdxs: number[] }>();
  
  for (const m of allMatches) {
    const offsetDiff = m.queryOffsetMs - m.offsetMs;
    const bucket = Math.round(offsetDiff / BUCKET_MS) * BUCKET_MS;
    const key = `${m.trackId}:${bucket}`;
    
    const data = votes.get(key) || { votes: 0, queryIdxs: [] };
    data.votes++;
    data.queryIdxs.push(m.queryIdx);
    votes.set(key, data);
  }
  
  // Find tracks with 8+ votes
  const candidates: any[] = [];
  for (const [key, data] of votes) {
    if (data.votes >= 8) {
      const [trackId, bucket] = key.split(':');
      candidates.push({ 
        trackId, 
        bucket: parseInt(bucket), 
        votes: data.votes, 
        queryIdxs: data.queryIdxs 
      });
    }
  }
  
  candidates.sort((a, b) => b.votes - a.votes);
  
  // Get track names
  const trackIds = [...new Set(candidates.map(c => c.trackId))];
  const trackMeta = await db.select({ id: knownTracks.id, title: knownTracks.title })
    .from(knownTracks)
    .where(inArray(knownTracks.id, trackIds));
  const trackMap = new Map(trackMeta.map(t => [t.id, t.title]));
  
  console.log('');
  console.log('Detected tracks:');
  
  const byTrack = new Map<string, any>();
  for (const c of candidates) {
    if (!byTrack.has(c.trackId)) {
      const minIdx = Math.min(...c.queryIdxs);
      const maxIdx = Math.max(...c.queryIdxs);
      byTrack.set(c.trackId, {
        title: trackMap.get(c.trackId),
        votes: c.votes,
        start: (minIdx * timePerHashMs / 1000).toFixed(1),
        end: (maxIdx * timePerHashMs / 1000).toFixed(1),
      });
    }
  }
  
  [...byTrack.values()]
    .sort((a, b) => parseFloat(a.start) - parseFloat(b.start))
    .forEach(t => {
      console.log(`  ${t.title}: ${t.votes} votes (${t.start}s - ${t.end}s)`);
    });
  
  process.exit(0);
}

test();
