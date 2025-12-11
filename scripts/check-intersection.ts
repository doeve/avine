import { execFile } from 'child_process';
import path from 'path';

const bin = path.join(process.cwd(), 'bin/fpcalc');

function getHashes(file: string): Promise<Set<number>> {
  return new Promise((resolve, reject) => {
    execFile(bin, ['-json', '-raw', file], (err, stdout) => {
      if (err) return reject(err);
      try {
        const res = JSON.parse(stdout);
        resolve(new Set(res.fingerprint));
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function compare(file1: string, file2: string) {
  console.log(`Comparing:\n${file1}\n${file2}`);
  const s1 = await getHashes(file1);
  const s2 = await getHashes(file2);
  
  console.log(`Set 1 Size: ${s1.size}`);
  console.log(`Set 2 Size: ${s2.size}`);
  
  const intersection = new Set([...s1].filter(x => s2.has(x)));
  console.log(`Intersection: ${intersection.size}`);
  
  const union = new Set([...s1, ...s2]);
  const jaccard = intersection.size / union.size;
  
  console.log(`Jaccard Similarity: ${jaccard}`);
  
  // Also check overlap of first 50 items (if ordered?)
  // Raw hashes are ordered time-series.
  // Intersection of sets ignores order.
}

const f1 = process.argv[2];
const f2 = process.argv[3];

compare(f1, f2);
