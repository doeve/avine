/**
 * Scan Mix Service
 * Calls server-side scan-mix endpoint for fingerprint analysis
 */

const API_URL = 'http://localhost:3000';

export interface ScanResult {
  tracks: Array<{
    title: string;
    artist: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  duration?: number;
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
 * Get audio URL (for platforms that need extraction)
 */
async function getAudioUrl(pageUrl: string): Promise<{ audioUrl: string; duration?: number }> {
  const response = await fetch(`${API_URL}/api/audio-url?url=${encodeURIComponent(pageUrl)}`);
  if (!response.ok) {
    throw new Error(`Failed to get audio URL: ${response.status}`);
  }
  return response.json();
}

/**
 * Full scan workflow: handles URL extraction and server-side fingerprinting
 */
export async function scanMix(
  mediaInfo: { src?: string; url?: string; duration?: number; platform?: string },
  onProgress?: (status: string) => void
): Promise<ScanResult> {
  try {
    let audioUrl: string;
    
    // Check if we have a direct media source (mp3, mp4, etc.)
    console.log(mediaInfo);
    debugger;
    if (mediaInfo.src && mediaInfo.src.startsWith('http')) {
      onProgress?.('Using direct media source...');
      audioUrl = mediaInfo.src;
    } else if (mediaInfo.platform === 'YouTube' || mediaInfo.platform === 'SoundCloud') {
      // For YouTube/SoundCloud, get audio URL from backend
      onProgress?.('Extracting audio stream...');
      const pageUrl = mediaInfo.url || '';
      if (!pageUrl) {
        return { tracks: [], error: 'No URL available' };
      }
      const data = await getAudioUrl(pageUrl);
      audioUrl = data.audioUrl;
    } else {
      return { tracks: [], error: 'Unsupported media source' };
    }
    
    if (!audioUrl) {
      return { tracks: [], error: 'No audio URL found' };
    }
    
    // Call server-side scan-mix endpoint
    onProgress?.('Analyzing audio (server-side)...');
    
    const response = await fetch(`${API_URL}/api/scan-mix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    onProgress?.('Complete');
    
    return {
      tracks: result.tracks,
      duration: result.duration
    };
    
  } catch (error) {
    console.error('Scan error:', error);
    return { 
      tracks: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
