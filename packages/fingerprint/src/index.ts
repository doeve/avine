import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface FingerprintResult {
  duration: number;
  fingerprint: string;
}

export interface AudioFingerprinterOptions {
  ffmpegPath?: string;
  fpcalcPath?: string;
}

export class AudioFingerprinter {
  private ffmpegPath: string;
  private fpcalcPath: string;

  constructor(options: AudioFingerprinterOptions = {}) {
    this.ffmpegPath = options.ffmpegPath || path.join(process.cwd(), 'bin/ffmpeg');
    this.fpcalcPath = options.fpcalcPath || path.join(process.cwd(), 'bin/fpcalc');
  }

  async fingerprintFile(filePath: string): Promise<FingerprintResult> {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      // fpcalc can handle audio files directly if they are in a supported format.
      // If we need to ensure raw PCM, we can pipe ffmpeg to fpcalc but fpcalc supports many formats.
      // Let's try running fpcalc directly on the file first.
      // Ideally we should use the -json flag for easier parsing.

      execFile(this.fpcalcPath, ['-json', '-raw', filePath], (error, stdout, stderr) => {
        if (error) {
          return reject(`fpcalc error: ${stderr || error.message}`);
        }

        try {
          const result = JSON.parse(stdout);
          if (result.duration && result.fingerprint) {
            resolve({
              duration: result.duration,
              // Store as stringified JSON if it's an array, to satisfy interface which expects string
              // checking if result.fingerprint is array
              fingerprint: Array.isArray(result.fingerprint) ? JSON.stringify(result.fingerprint) : result.fingerprint,
            });
          } else {
            reject('Invalid fpcalc output');
          }
        } catch (e) {
          console.error('fpcalc parse error output:', stdout.substring(0, 100));
          reject(`Failed to parse fpcalc output: ${e}`);
        }
      });
    });
  }

  generateEmbedding(fingerprint: string): number[] {
    let fpArray: number[];
    try {
      fpArray = JSON.parse(fingerprint);
      if (!Array.isArray(fpArray)) {
         fpArray = [];
         for(let i=0; i<fingerprint.length; i++) fpArray.push(fingerprint.charCodeAt(i));
      }
    } catch {
       fpArray = [];
       for(let i=0; i<fingerprint.length; i++) fpArray.push(fingerprint.charCodeAt(i));
    }

    // MinHash Implementation
    // Dimensions: 1536
    const DIMENSIONS = 1536;
    const signature = new Array(DIMENSIONS).fill(Infinity);
    const PRIME = 4294967311; // A prime slightly larger than 2^32

    // Deterministic Permutations
    // We need 1536 pairs of (a, b)
    // We can generate them on the fly or hardcode.
    // For performance, generate on fly using a seed.
    // Ideally we'd precompute, but this is fine.
    
    // We treat the fpArray (integers) as a SET of features.
    // For each dimension k:
    //   h_min = Infinity
    //   For each item x in fpArray:
    //      h(x) = (a_k * x + b_k) % PRIME
    //      h_min = min(h_min, h_x)
    //   signature[k] = h_min
    
    // To generate a_k, b_k deterministically:
    // pseudo-random based on k.
    
    for (let k = 0; k < DIMENSIONS; k++) {
        // Simple LCG or just hash k to get a and b
        // a must be odd/coprime? Just large non-zero.
        // Let's use a simple deterministic RNG based on k
        let seed = k * 12345 + 6789;
        const rand = () => {
             seed = (seed * 1664525 + 1013904223) % 4294967296;
             return seed;
        };
        
        // Ensure a, b are positive unsigned 32-bit
        // rand() returns 0..2^32-1 (approx)
        const r1 = rand();
        const r2 = rand();
        
        // FIX: output of bitwise OR can be negative. Apply >>> 0 last.
        const aVal = (r1 | 1) >>> 0;
        const bVal = r2 >>> 0;
        
        const a = BigInt(aVal);
        const b = BigInt(bVal);
        
        let minHash = BigInt(PRIME);
        
        for (const rawX of fpArray) {
            const x = BigInt(rawX >>> 0); 
            const h = (a * x + b) % BigInt(PRIME);
            if (h < minHash) minHash = h;
        }
        
        // Normalize to 0-1 range for embedding
        signature[k] = Number(minHash) / PRIME;
    }
    
    return signature;
  }
}
