import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { addUrlJob } from '../queue/queue.service';
import { db, sessions, tracks } from '@avine/core';
import { eq, desc } from 'drizzle-orm';
import z from 'zod';
import { authenticate } from '../auth/auth.middleware';

export async function analysisRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>()
    .post('/analyze-url', {
      schema: {
        body: z.object({
          url: z.string().url(),
        }),
        response: {
          200: z.object({
            sessionId: z.string(),
            status: z.string(),
          }),
        },
      },
    }, async (request, reply) => {
      // Authenticate
      await authenticate(request, reply);
      if (!request.user) return;

      const { url } = request.body;
      const userId = request.user.userId; 
      
      const [session] = await db.insert(sessions).values({
        userId: userId,
        sourceType: 'URL',
        sourceUrl: url,
        status: 'PENDING',
      }).returning();

      await addUrlJob(session.id, url);

      return {
        sessionId: session.id,
        status: session.status,
      };
    })
    .get('/sessions', {
      schema: {
        response: {
          200: z.array(z.object({
            id: z.string(),
            sourceType: z.string(),
            sourceUrl: z.string().nullable(),
            status: z.string(),
            createdAt: z.string(),
            duration: z.number().nullable(),
          })),
        },
      },
    }, async (request, reply) => {
      // Authenticate
      await authenticate(request, reply);
      if (!request.user) return;

      const userId = request.user.userId;

      const userSessions = await db.select().from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.createdAt));

      return userSessions.map(s => ({
        id: s.id,
        sourceType: s.sourceType,
        sourceUrl: s.sourceUrl,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        duration: s.duration,
      }));
    })
    .get('/sessions/:id', {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            status: z.string(),
            tracks: z.array(z.object({
              title: z.string(),
              artist: z.string(),
              startTime: z.number(),
              endTime: z.number(),
              confidence: z.number(),
            })),
          }),
        },
      },
    }, async (request, reply) => {
      const { id } = request.params;

      const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
      
      if (!session) {
        return reply.status(404).send({ message: 'Session not found' } as any);
      }

      const sessionTracks = await db.select().from(tracks).where(eq(tracks.sessionId, id));

      return {
        id: session.id,
        status: session.status,
        tracks: sessionTracks.map(t => ({
          title: t.title,
          artist: t.artist,
          startTime: t.startTime,
          endTime: t.endTime,
          confidence: t.confidence,
        })),
      };
    })
    // Create a new session (for extension or other sources)
    .post('/sessions', {
      schema: {
        body: z.object({
          sourceType: z.enum(['BROWSER_EXTENSION', 'FILE_UPLOAD', 'URL']),
          sourceUrl: z.string().optional(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            status: z.string(),
          }),
        },
      },
    }, async (request, reply) => {
      await authenticate(request, reply);
      if (!request.user) return;

      const { sourceType, sourceUrl } = request.body;
      const userId = request.user.userId;

      const [session] = await db.insert(sessions).values({
        userId,
        sourceType,
        sourceUrl: sourceUrl || null,
        status: 'PROCESSING',
      }).returning();

      return {
        id: session.id,
        status: session.status,
      };
    })
    // Add a track to a session
    .post('/sessions/:id/tracks', {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          title: z.string(),
          artist: z.string(),
          startTime: z.number(),
          endTime: z.number(),
          confidence: z.number(),
          album: z.string().optional(),
          duration: z.number().optional(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            trackId: z.string(),
          }),
        },
      },
    }, async (request, reply) => {
      await authenticate(request, reply);
      if (!request.user) return;

      const { id } = request.params;
      const trackData = request.body;

      // Verify session belongs to user
      const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
      if (!session || session.userId !== request.user.userId) {
        return reply.status(404).send({ message: 'Session not found' } as any);
      }

      const [track] = await db.insert(tracks).values({
        sessionId: id,
        title: trackData.title,
        artist: trackData.artist,
        startTime: trackData.startTime,
        endTime: trackData.endTime,
        confidence: trackData.confidence,
        album: trackData.album || null,
        duration: trackData.duration || (trackData.endTime - trackData.startTime),
      }).returning();

      return {
        success: true,
        trackId: track.id,
      };
    })
    // Complete a session  
    .post('/sessions/:id/complete', {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
          }),
        },
      },
    }, async (request, reply) => {
      await authenticate(request, reply);
      if (!request.user) return;

      const { id } = request.params;

      const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
      if (!session || session.userId !== request.user.userId) {
        return reply.status(404).send({ message: 'Session not found' } as any);
      }

      await db.update(sessions)
        .set({ status: 'COMPLETED' })
        .where(eq(sessions.id, id));

      return { success: true };
    });
}
