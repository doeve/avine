/**
 * Subfingerprint-based ingestion script
 * 
 * Stores individual Chromaprint hash values with their time offsets
 * for position-independent audio matching.
 * 
 * Usage: npx tsx scripts/ingest-subfingerprints.ts <folder> [--clean]
 */

import fs from 'fs';
import path from 'path';
import { db, knownTracks, subfingerprints } from '@avine/core';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const fpcalcPath = path.join(process.cwd(), 'bin/fpcalc');

console.log('Subfingerprint Ingestion');
console.log('========================');
console.log('fpcalc path:', fpcalcPath);

interface FpcalcResult {
  duration: number;
  fingerprint: number[];
}

async function fingerprintFile(filePath: string): Promise<FpcalcResult> {
  const { stdout } = await execFileAsync(fpcalcPath, ['-json', '-raw', filePath]);
  return JSON.parse(stdout);
}

async function ingestFolder(folderPath: string, clean: boolean = false) {
  if (clean) {
    console.log('\nCleaning database...');
    await db.delete(subfingerprints).execute();
    // Note: We keep known_tracks as they contain metadata
    // Only delete subfingerprints for reindexing
    console.log('Subfingerprints table cleared.');
  }

  console.log(`\nScanning folder: ${folderPath}`);
  
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

  const audioFiles = getAudioFiles(folderPath);
  console.log(`Found ${audioFiles.length} audio files.\n`);

  let totalSubfingerprints = 0;

  for (const filePath of audioFiles) {
    const file = path.basename(filePath);
    console.log(`Processing ${file}...`);

    try {
      // 1. Get fingerprint
      const result = await fingerprintFile(filePath);
      
      // 2. Parse filename for metadata
      const filename = path.parse(file).name;
      const parts = filename.split(' - ');
      const artist = parts.length > 1 ? parts[0] : 'Unknown Artist';
      const title = parts.length > 1 ? parts.slice(1).join(' - ') : filename;

      // 3. Insert or find the track in known_tracks
      // For now, insert new track (in production, you'd want to check for duplicates)
      const [track] = await db.insert(knownTracks).values({
        title,
        artist,
        duration: Math.floor(result.duration),
        fingerprint: JSON.stringify(result.fingerprint), // Store raw fingerprint for reference
        // No embedding needed anymore
      }).returning();

      console.log(`  Track: ${artist} - ${title} (${Math.floor(result.duration)}s)`);
      console.log(`  Fingerprint: ${result.fingerprint.length} hashes`);

      // 4. Calculate time per hash
      const timePerHashMs = (result.duration * 1000) / result.fingerprint.length;

      // 5. Insert subfingerprints in batches
      const BATCH_SIZE = 1000;
      const subfingerData = result.fingerprint.map((hash, index) => ({
        hash: hash >>> 0, // Ensure unsigned 32-bit
        trackId: track.id,
        offsetMs: Math.round(index * timePerHashMs),
      }));

      for (let i = 0; i < subfingerData.length; i += BATCH_SIZE) {
        const batch = subfingerData.slice(i, i + BATCH_SIZE);
        await db.insert(subfingerprints).values(batch);
      }

      totalSubfingerprints += result.fingerprint.length;
      console.log(`  Inserted ${result.fingerprint.length} subfingerprints`);

    } catch (error) {
      console.error(`  Failed to ingest ${file}:`, error);
    }
  }

  console.log('\n========================');
  console.log('Ingestion complete!');
  console.log(`Total tracks: ${audioFiles.length}`);
  console.log(`Total subfingerprints: ${totalSubfingerprints}`);
  
  process.exit(0);
}

const folder = process.argv[2];
const clean = process.argv.includes('--clean');

if (!folder) {
  console.error('Usage: npx tsx scripts/ingest-subfingerprints.ts <folder_path> [--clean]');
  process.exit(1);
}

ingestFolder(folder, clean);
