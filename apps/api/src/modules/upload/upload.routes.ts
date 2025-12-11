import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { StorageService } from '../storage/storage.service';
import { addAudioJob } from '../queue/queue.service';
import { db, sessions } from '@avine/core';
import z from 'zod';
import { authenticate } from '../auth/auth.middleware';

export async function uploadRoutes(app: FastifyInstance) {
  const storageService = new StorageService();

  app.withTypeProvider<ZodTypeProvider>().post('/upload', {
    schema: {
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
    // If auth failed, authenticate usually sends a response but in `preHandler` hook. 
    // If called inside handler, we need to check if response was sent or throw error in authenticate.
    // Better pattern is to use onRequest/preHandler hook, but for now specific to this route:
    if (!request.user) return; // Authenticate sent 401.

    const data = await (request as any).file();
    
    if (!data) {
      return reply.status(400).send({ message: 'No file uploaded' } as any);
    }

    // 1. Upload to MinIO
    const fileKey = await storageService.uploadFile(data);

    // 2. Create Session
    const userId = request.user.userId;
    
    const [session] = await db.insert(sessions).values({
      userId: userId,
      sourceType: 'FILE_UPLOAD',
      status: 'PENDING',
    }).returning();

    // 3. Add to Queue
    await addAudioJob(session.id, fileKey);

    return {
      sessionId: session.id,
      status: session.status,
    };
  });
}
