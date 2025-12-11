import fs from 'fs';
import path from 'path';
import { db, knownTracks, trackSegments } from '@avine/core';
import { AudioFingerprinter } from '@avine/fingerprint';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import os from 'os';

const fingerprinter = new AudioFingerprinter();

console.log('DB Connection:', process.env.DATABASE_URL || 'Using default');

async function ingestFolder(folderPath: string, clean: boolean = false) {
  if (clean) {
    console.log('Cleaning database...');
    await db.delete(trackSegments).execute();
    await db.delete(knownTracks).execute();
    console.log('Database cleaned.');
  }

  console.log(`Scanning folder: ${folderPath}`);
  
  if (!fs.existsSync(folderPath)) {
    console.error('Folder does not exist');
    process.exit(1);
  }

  // Recursive file listing
  function getAudioFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
         results = results.concat(getAudioFiles(fullPath));
      } else {
         if (/\.(mp3|wav|flac|m4a)$/i.test(file)) {
             results.push(fullPath);
         }
      }
    });
    return results;
  }

  const audioFiles = getAudioFiles(folderPath); // Returns absolute paths
  console.log(`Found ${audioFiles.length} audio files.`);

  for (const filePath of audioFiles) {
    // filePath is already full path
    const file = path.basename(filePath);
    console.log(`Processing ${file}...`);

    try {
      // 1. Ingest Master Track (Whole File)
      // Note: We still ingest the whole track metadata, but maybe not the whole embedding for matching?
      // Actually, keeping the whole embedding is fine for "exact match" if we ever need it.
      // But for now, let's just get metadata.
      const result = await fingerprinter.fingerprintFile(filePath);
      
      const filename = path.parse(file).name;
      const parts = filename.split(' - ');
      const artist = parts.length > 1 ? parts[0] : 'Unknown Artist';
      const title = parts.length > 1 ? parts.slice(1).join(' - ') : filename;

      const [track] = await db.insert(knownTracks).values({
        title,
        artist,
        duration: Math.floor(result.duration),
        fingerprint: result.fingerprint,
        // We can still store the whole-file embedding if we want, or null.
        // Let's store it.
        embedding: fingerprinter.generateEmbedding(result.fingerprint),
      }).returning();

      console.log(`Ingested: ${artist} - ${title} (Master)`);

      // 2. Segmented Ingestion (Sliding Window)
      // Chunk size: 10s, Step: 5s
      const duration = result.duration;
      const CHUNK_Duration = 10;
      const STEP = 5;
      
      console.log(`Generating segments for ${file} (${duration}s)...`);

      for (let start = 0; start < duration - CHUNK_Duration; start += STEP) {
        const chunkPath = path.join(os.tmpdir(), `${randomUUID()}.wav`);
        
        // Use ffmpeg to extract chunk
        // ffmpeg -ss START -t DURATION -i INPUT -ac 1 -ar 11025 encoded_chunk.wav
        // We use system ffmpeg (assumed in path or bin/ffmpeg)
        // Since AudioFingerprinter knows where ffmpeg is, we could expose it or just use 'ffmpeg' 
        // if we added it to PATH or use the local bin path.
        const ffmpegBin = path.join(process.cwd(), 'bin/ffmpeg');
        
        await new Promise<void>((resolve, reject) => {
           execFile(ffmpegBin, [
             '-ss', start.toString(),
             '-t', CHUNK_Duration.toString(),
             '-i', filePath,
             '-ac', '1',
             '-ar', '11025',
             '-y', // overwite
             chunkPath
           ], (err) => {
             if (err) reject(err);
             else resolve();
           });
        });

        // Fingerprint chunk
        try {
          const chunkResult = await fingerprinter.fingerprintFile(chunkPath);
          const chunkEmbedding = fingerprinter.generateEmbedding(chunkResult.fingerprint);

          // Insert Segment
          // We need to import trackSegments from core. 
          // Since we might not have updated imports yet, let's assume valid imports or fix them.
          // Note: db.insert(trackSegments)
          await db.insert(trackSegments).values({
            trackId: track.id,
            startTime: start,
            duration: CHUNK_Duration,
            embedding: chunkEmbedding,
          });

        } catch (e) {
             console.warn(`Failed to process chunk at ${start}s: ${e}`);
        } finally {
            if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
        }
      }
      console.log(`Segments ingested for ${file}`);

    } catch (error) {
      console.error(`Failed to ingest ${file}:`, error);
    }
  }

  console.log('Ingestion complete.');
  process.exit(0);
}

const folder = process.argv[2];
const clean = process.argv.includes('--clean');

if (!folder) {
  console.error('Usage: npm run ingest <folder_path> [--clean]');
  process.exit(1);
}

ingestFolder(folder, clean);
