import { db, trackSegments, knownTracks } from '@avine/core';
import { AudioFingerprinter } from '@avine/fingerprint';
import { sql } from 'drizzle-orm';
import path from 'path';
import { execFile } from 'child_process';
import os from 'os';
import { randomUUID } from 'crypto';
import fs from 'fs';

const fingerprinter = new AudioFingerprinter();

async function debugFile(filePath: string, startTime: number = 20) {
  console.log(`Debugging file: ${filePath} at ${startTime}s`);
  
  const chunkPath = path.join(os.tmpdir(), `${randomUUID()}.wav`);
  const ffmpegBin = path.join(process.cwd(), 'bin/ffmpeg');

  try {
    // Extract 10s chunk
    await new Promise<void>((resolve, reject) => {
       execFile(ffmpegBin, [
         '-ss', startTime.toString(),
         '-t', '10',
         '-i', filePath,
         '-ac', '1',
         '-ar', '11025',
         '-y',
         chunkPath
       ], (err) => {
         if (err) reject(err);
         else resolve();
       });
    });

    const result = await fingerprinter.fingerprintFile(chunkPath);
    console.log('Chunk duration:', result.duration);
    console.log('Chunk fingerprint length:', result.fingerprint.length);
    
    const embedding = fingerprinter.generateEmbedding(result.fingerprint);
    console.log('Embedding sample (first 10):', embedding.slice(0, 10));
    console.log('Embedding Magnitude:', Math.sqrt(embedding.reduce((s, v) => s + v*v, 0)));

    console.log('Querying DB for top 5 matches...');
    const matches = await db.execute(sql`
      SELECT ts.*, kt.title, kt.artist, 
             (ts.embedding <-> ${JSON.stringify(embedding)}) as distance,
             1 - (ts.embedding <=> ${JSON.stringify(embedding)}) as similarity
      FROM track_segments ts
      JOIN known_tracks kt ON ts.track_id = kt.id
      ORDER BY ts.embedding <-> ${JSON.stringify(embedding)}
      LIMIT 5;
    `);

    console.log('Top Matches:');
    matches.forEach((m: any, i) => {
      console.log(`${i+1}. ${m.artist} - ${m.title}`);
      console.log(`   L2 Dist: ${m.distance}`);
      console.log(`   Cosine Sim: ${m.similarity}`);
      console.log(`   Segment Offset: ${m.start_time}s`);
      console.log(`   Track ID: ${m.track_id}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
     if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
     process.exit(0);
  }
}

const file = process.argv[2] || 'test_audio/mix_2m44s.mp3';
const start = Number(process.argv[3]) || 20;

debugFile(file, start);
