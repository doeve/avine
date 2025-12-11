/**
 * Export Routes - API endpoints for exporting session data
 */

import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db, sessions, tracks } from '@avine/core';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { authenticate } from '../auth/auth.middleware';
import { 
  exportSession, 
  getMimeType, 
  getFileExtension, 
  ExportFormat, 
  SessionData, 
  TrackData 
} from './export.service';

const exportFormats = ['json', 'csv', 'txt', 'youtube', 'cue', 'm3u', 'markdown'] as const;

export async function exportRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>()
    
    // Export session in specified format
    .get('/sessions/:id/export', {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        querystring: z.object({
          format: z.enum(exportFormats).default('json'),
          download: z.string().optional().transform(v => v === 'true'),
        }),
        response: {
          200: z.any(), // Response type varies by format
        },
      },
    }, async (request, reply) => {
      await authenticate(request, reply);
      if (!request.user) return;

      const { id } = request.params;
      const { format, download } = request.query;

      // Get session
      const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
      
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }

      // Verify ownership
      if (session.userId !== request.user.userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Get tracks
      const sessionTracks = await db.select().from(tracks).where(eq(tracks.sessionId, id));

      // Build session data
      const sessionData: SessionData = {
        id: session.id,
        sourceType: session.sourceType,
        sourceUrl: session.sourceUrl || undefined,
        duration: session.duration || 0,
        createdAt: session.createdAt,
        tracks: sessionTracks.map(t => ({
          title: t.title,
          artist: t.artist,
          album: t.album || undefined,
          startTime: t.startTime,
          endTime: t.endTime,
          confidence: t.confidence,
        })),
      };

      // Generate export
      const output = exportSession(sessionData, format as ExportFormat);
      const mimeType = getMimeType(format as ExportFormat);
      const extension = getFileExtension(format as ExportFormat);

      // Set headers
      reply.header('Content-Type', mimeType);
      
      if (download) {
        const filename = `avine-${session.id.slice(0, 8)}.${extension}`;
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      }

      return output;
    })

    // Get available export formats
    .get('/export/formats', {
      schema: {
        response: {
          200: z.array(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            extension: z.string(),
          })),
        },
      },
    }, async () => {
      return [
        { id: 'json', name: 'JSON', description: 'Full structured data with all metadata', extension: 'json' },
        { id: 'csv', name: 'CSV', description: 'Spreadsheet-compatible format', extension: 'csv' },
        { id: 'txt', name: 'Plain Text', description: 'Human-readable tracklist', extension: 'txt' },
        { id: 'youtube', name: 'YouTube Chapters', description: 'Formatted for video description', extension: 'txt' },
        { id: 'cue', name: 'CUE Sheet', description: 'Standard audio track indexing format', extension: 'cue' },
        { id: 'm3u', name: 'M3U Playlist', description: 'Playlist format for media players', extension: 'm3u' },
        { id: 'markdown', name: 'Markdown', description: 'Formatted for documentation', extension: 'md' },
      ];
    });
}
