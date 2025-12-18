import { FastifyPluginAsync } from 'fastify';
import { db } from '@avine/core';
import { exportTemplates } from '@avine/core';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { authenticate } from '../auth/auth.middleware';

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  format: z.enum(['txt', 'json', 'csv', 'custom']).default('txt'),
  template: z.string().min(1),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  format: z.enum(['txt', 'json', 'csv', 'custom']).optional(),
  template: z.string().min(1).optional(),
});

export const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  // List all templates for user
  fastify.get('/templates', async (request, reply) => {
    await authenticate(request, reply);
    if (!request.user) return;
    const userId = request.user.userId;

    const templates = await db
      .select()
      .from(exportTemplates)
      .where(eq(exportTemplates.userId, userId))
      .orderBy(exportTemplates.createdAt);

    return templates;
  });

  // Create a new template
  fastify.post('/templates', async (request, reply) => {
    await authenticate(request, reply);
    if (!request.user) return;
    const userId = request.user.userId;

    const body = CreateTemplateSchema.parse(request.body);

    const [template] = await db
      .insert(exportTemplates)
      .values({
        userId,
        name: body.name,
        description: body.description || null,
        format: body.format,
        template: body.template,
        isDefault: false,
      })
      .returning();

    return template;
  });

  // Update a template
  fastify.put('/templates/:id', async (request, reply) => {
    await authenticate(request, reply);
    if (!request.user) return;
    const userId = request.user.userId;

    const { id } = request.params as { id: string };
    const body = UpdateTemplateSchema.parse(request.body);

    const [template] = await db
      .update(exportTemplates)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(exportTemplates.id, id), eq(exportTemplates.userId, userId)))
      .returning();

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    return template;
  });

  // Delete a template
  fastify.delete('/templates/:id', async (request, reply) => {
    await authenticate(request, reply);
    if (!request.user) return;
    const userId = request.user.userId;

    const { id } = request.params as { id: string };

    const [deleted] = await db
      .delete(exportTemplates)
      .where(and(eq(exportTemplates.id, id), eq(exportTemplates.userId, userId)))
      .returning();

    if (!deleted) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    return { success: true };
  });

  // Set template as default
  fastify.put('/templates/:id/default', async (request, reply) => {
    await authenticate(request, reply);
    if (!request.user) return;
    const userId = request.user.userId;

    const { id } = request.params as { id: string };

    // Unset all other defaults for this user
    await db
      .update(exportTemplates)
      .set({ isDefault: false })
      .where(eq(exportTemplates.userId, userId));

    // Set this one as default
    const [template] = await db
      .update(exportTemplates)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(exportTemplates.id, id), eq(exportTemplates.userId, userId)))
      .returning();

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    return template;
  });
};
