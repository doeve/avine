/**
 * Stream Gateway - Real-time audio recognition via WebSockets
 * Uses subfingerprint matching for accurate detection
 */

import { Server, Socket } from 'socket.io';
import { db, subfingerprints, knownTracks } from '@avine/core';
import { inArray } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const projectRoot = process.cwd().endsWith('api') ? path.join(process.cwd(), '../../') : process.cwd();
const fpcalcPath = path.join(projectRoot, 'bin/fpcalc');

interface FpcalcResult {
  duration: number;
  fingerprint: number[];
}

async function fingerprintFile(filePath: string): Promise<FpcalcResult> {
  const { stdout } = await execFileAsync(fpcalcPath, ['-json', '-raw', filePath]);
  return JSON.parse(stdout);
}

interface StreamSession {
  buffer: Buffer[];
  lastRecognition: number;
  currentTrack: { title: string; artist: string } | null;
  trackHistory: Array<{ title: string; artist: string; timestamp: number }>;
}

const sessions = new Map<string, StreamSession>();

const RECOGNITION_INTERVAL = 3000; // Check every 3s for better stability
const BYTES_PER_SEC = 22050; // 11025Hz * 2 bytes/sample
const BUFFER_SIZE_BYTES = BYTES_PER_SEC * 10; // Keep last 10s
const MIN_VOTES = 5; // Minimum hash matches for stream detection
const BUCKET_MS = 500; // Offset bucket size

export function setupStreamGateway(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Stream client connected:', socket.id);
    sessions.set(socket.id, { 
      buffer: [], 
      lastRecognition: Date.now(),
      currentTrack: null,
      trackHistory: [],
    });

    socket.on('audio_chunk', async (chunk: ArrayBuffer) => {
      const session = sessions.get(socket.id);
      if (!session) return;

      // Append chunk to buffer
      session.buffer.push(Buffer.from(chunk));

      // Manage buffer size (sliding window)
      const currentSize = session.buffer.reduce((acc, b) => acc + b.length, 0);
      
      if (currentSize > BUFFER_SIZE_BYTES * 1.5) {
        const fullBuf = Buffer.concat(session.buffer);
        const keep = fullBuf.subarray(fullBuf.length - BUFFER_SIZE_BYTES);
        session.buffer = [keep];
      }

      // Check if enough time passed for recognition
      if (Date.now() - session.lastRecognition > RECOGNITION_INTERVAL) {
        session.lastRecognition = Date.now();
        
        const fullBuf = Buffer.concat(session.buffer);
        // Need at least 3s of audio
        if (fullBuf.length > BYTES_PER_SEC * 3) {
          const bufToRecognize = fullBuf.length > BUFFER_SIZE_BYTES 
            ? fullBuf.subarray(fullBuf.length - BUFFER_SIZE_BYTES)
            : fullBuf;
             
          await recognizeBuffer(socket, session, bufToRecognize);
        }
      }
    });

    socket.on('get_history', () => {
      const session = sessions.get(socket.id);
      if (session) {
        socket.emit('track_history', session.trackHistory);
      }
    });

    socket.on('disconnect', () => {
      console.log('Stream client disconnected:', socket.id);
      sessions.delete(socket.id);
    });
  });
}

async function recognizeBuffer(socket: Socket, session: StreamSession, buffer: Buffer) {
  if (buffer.length === 0) return;

  // Write to temporary WAV file
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + buffer.length, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20); // PCM
  wavHeader.writeUInt16LE(1, 22); // Mono
  wavHeader.writeUInt32LE(11025, 24); // Sample Rate
  wavHeader.writeUInt32LE(11025 * 2, 28); // Byte Rate
  wavHeader.writeUInt16LE(2, 32); // Block Align
  wavHeader.writeUInt16LE(16, 34); // Bits per Sample
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(buffer.length, 40);

  const wavPath = path.join(os.tmpdir(), `${randomUUID()}.wav`);
  fs.writeFileSync(wavPath, Buffer.concat([wavHeader, buffer]));

  try {
    // Get fingerprint
    const result = await fingerprintFile(wavPath);
    const queryHashes = result.fingerprint.map(h => h >>> 0);
    const timePerHashMs = (result.duration * 1000) / queryHashes.length;

    if (queryHashes.length === 0) return;

    // Query matching hashes
    const matches = await db.select({
      hash: subfingerprints.hash,
      trackId: subfingerprints.trackId,
      offsetMs: subfingerprints.offsetMs,
    })
    .from(subfingerprints)
    .where(inArray(subfingerprints.hash, queryHashes));

    if (matches.length === 0) {
      socket.emit('recognition_status', { status: 'listening', message: 'No match found' });
      return;
    }

    // Group by (track, offset_diff bucket)
    const votes = new Map<string, { votes: number; trackId: string }>();

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      // Find query index for this hash
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
      .where(inArray(knownTracks.id, [bestCandidate.trackId]));

      if (trackMeta) {
        const confidence = Math.min(100, Math.floor(bestCandidate.votes * 2));
        
        // Check if this is a new track
        const isNewTrack = !session.currentTrack || 
          session.currentTrack.title !== trackMeta.title || 
          session.currentTrack.artist !== trackMeta.artist;

        if (isNewTrack) {
          session.currentTrack = { title: trackMeta.title, artist: trackMeta.artist };
          session.trackHistory.push({
            title: trackMeta.title,
            artist: trackMeta.artist,
            timestamp: Date.now(),
          });

          // Emit new track event
          socket.emit('new_track', {
            title: trackMeta.title,
            artist: trackMeta.artist,
            confidence,
            timestamp: Date.now(),
          });
        }

        // Always emit current playing status
        socket.emit('recognition_result', {
          title: trackMeta.title,
          artist: trackMeta.artist,
          confidence,
          votes: bestCandidate.votes,
        });

        console.log(`Stream Match: ${trackMeta.artist} - ${trackMeta.title} (Votes: ${bestCandidate.votes}, Conf: ${confidence}%)`);
      }
    } else {
      socket.emit('recognition_status', { 
        status: 'listening', 
        message: `Analyzing... (${matches.length} hash matches)` 
      });
    }

  } catch (error) {
    console.error('Stream recognition error:', error);
  } finally {
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
  }
}
