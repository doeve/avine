/**
 * Audio Fingerprinting Service
 * Client-side fingerprint generation using @unimusic/chromaprint WASM
 */

import { processAudioFile, ChromaprintAlgorithm } from '@unimusic/chromaprint';

const API_URL = 'http://localhost:3000';

export interface ScanResult {
  tracks: Array<{
    title: string;
    artist: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  error?: string;
}

export interface MediaInfo {
  found: boolean;
  platform: string;
  title: string;
  artist: string;
  duration: number;
  src: string;
  url: string;
}

/**
 * Fetches audio file from URL and generates fingerprints
 */
export async function fetchAndFingerprint(
  audioUrl: string,
  onProgress?: (status: string) => void
): Promise<string[]> {
  onProgress?.('Fetching audio file...');
  
  // Fetch the audio file
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  onProgress?.('Generating fingerprints...');
  
  // Generate fingerprints using chromaprint WASM
  const fingerprints: string[] = [];
  
  // Process with chunked fingerprints for mix analysis
  const generator = processAudioFile(arrayBuffer, {
    maxDuration: 600, // 10 minutes max per chunk
    chunkDuration: 30, // 30 second chunks for track detection
    algorithm: ChromaprintAlgorithm.Default,
    rawOutput: true, // Get raw fingerprint for matching
    overlap: true, // Overlap chunks for better detection
  });
  
  for await (const fingerprint of generator) {
    fingerprints.push(fingerprint);
    onProgress?.(`Generated ${fingerprints.length} fingerprints...`);
  }
  
  return fingerprints;
}

/**
 * Sends fingerprints to server for matching
 */
export async function matchFingerprints(
  fingerprints: string[],
  duration: number,
  onProgress?: (status: string) => void
): Promise<ScanResult> {
  onProgress?.('Analyzing fingerprints...');
  
  // Convert raw fingerprint strings to segment format
  const segments = fingerprints.map((fp, idx) => {
    // Parse comma-separated raw fingerprint
    const hashes = fp.split(',').map(h => parseInt(h, 10) >>> 0);
    return {
      start: idx * 30, // 30 second chunks
      fingerprint: hashes
    };
  });
  
  const response = await fetch(`${API_URL}/api/analyze-fingerprints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      segments,
      duration,
      segmentDuration: 30
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Full scan workflow: fetch audio, fingerprint, and match
 */
export async function scanMix(
  audioUrl: string,
  duration: number,
  onProgress?: (status: string) => void
): Promise<ScanResult> {
  try {
    const fingerprints = await fetchAndFingerprint(audioUrl, onProgress);
    
    if (fingerprints.length === 0) {
      return { tracks: [], error: 'No fingerprints generated' };
    }
    
    const result = await matchFingerprints(fingerprints, duration, onProgress);
    onProgress?.('Complete');
    
    return result;
  } catch (error) {
    console.error('Scan error:', error);
    return { 
      tracks: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get audio URL from various platforms
 * Note: For YouTube/SoundCloud, we need a proxy or backend service
 */
export async function getAudioUrl(mediaInfo: MediaInfo): Promise<string | null> {
  // For direct audio/video files
  if (mediaInfo.src && mediaInfo.src.startsWith('http')) {
    return mediaInfo.src;
  }
  
  // For YouTube - need to get audio stream URL via backend
  if (mediaInfo.platform === 'YouTube') {
    try {
      const response = await fetch(`${API_URL}/api/audio-url?url=${encodeURIComponent(mediaInfo.url)}`);
      if (response.ok) {
        const data = await response.json();
        return data.audioUrl;
      }
    } catch (error) {
      console.error('Failed to get YouTube audio URL:', error);
    }
  }
  
  // For SoundCloud
  if (mediaInfo.platform === 'SoundCloud') {
    try {
      const response = await fetch(`${API_URL}/api/audio-url?url=${encodeURIComponent(mediaInfo.url)}`);
      if (response.ok) {
        const data = await response.json();
        return data.audioUrl;
      }
    } catch (error) {
      console.error('Failed to get SoundCloud audio URL:', error);
    }
  }
  
  return null;
}
