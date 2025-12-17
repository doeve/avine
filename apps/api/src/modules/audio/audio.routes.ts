/**
 * Audio URL Routes
 * Extracts audio stream URLs from various platforms using yt-dlp
 */

import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import z from 'zod';

const execFileAsync = promisify(execFile);

// Check if yt-dlp is available
let ytdlpAvailable: boolean | null = null;

async function checkYtdlp(): Promise<boolean> {
  if (ytdlpAvailable !== null) return ytdlpAvailable;
  
  try {
    await execFileAsync('yt-dlp', ['--version'], { timeout: 5000 });
    ytdlpAvailable = true;
    console.log('[Audio URL] yt-dlp is available');
  } catch {
    ytdlpAvailable = false;
    console.warn('[Audio URL] yt-dlp is NOT available. Install with: pip install yt-dlp');
  }
  return ytdlpAvailable;
}

export async function audioUrlRoutes(app: FastifyInstance) {
  // Check yt-dlp on route registration
  await checkYtdlp();
  
  app.withTypeProvider<ZodTypeProvider>()
    .get('/audio-url', {
      schema: {
        querystring: z.object({
          url: z.string().url(),
        }),
        response: {
          200: z.object({
            audioUrl: z.string(),
            duration: z.number().optional(),
            title: z.string().optional(),
          })
        }
      }
    }, async (request, reply) => {
      const { url } = request.query;
      
      // Check yt-dlp availability
      if (!await checkYtdlp()) {
        return reply.status(503).send({ 
          message: 'yt-dlp is not installed. Install with: pip install yt-dlp' 
        } as any);
      }
      
      console.log(`[Audio URL] Extracting audio URL for: ${url}`);
      
      try {
        // Use yt-dlp to get audio stream URL
        const { stdout } = await execFileAsync('yt-dlp', [
          '--get-url',
          '--format', 'bestaudio/best',
          '--no-playlist',
          url
        ], { timeout: 30000 });
        
        const audioUrl = stdout.trim().split('\n')[0];
        
        if (!audioUrl) {
          return reply.status(404).send({ message: 'No audio URL found' } as any);
        }
        
        // Try to get additional info
        let duration: number | undefined;
        let title: string | undefined;
        
        try {
          const { stdout: infoJson } = await execFileAsync('yt-dlp', [
            '--dump-json',
            '--no-playlist',
            url
          ], { timeout: 30000 });
          
          const info = JSON.parse(infoJson);
          duration = info.duration;
          title = info.title;
        } catch {
          // Info extraction failed, continue without it
        }
        
        console.log(`[Audio URL] Found: ${audioUrl.substring(0, 100)}...`);
        
        return { audioUrl, duration, title };
        
      } catch (error) {
        console.error('[Audio URL] Error:', error);
        return reply.status(500).send({ 
          message: `Failed to extract audio URL: ${error instanceof Error ? error.message : error}` 
        } as any);
      }
    });
}
