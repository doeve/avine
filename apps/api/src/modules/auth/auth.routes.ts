import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema, tokenResponseSchema, errorSchema } from './auth.schema';

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService();

  app.withTypeProvider<ZodTypeProvider>().post('/register', {
    schema: {
      body: registerSchema,
      response: {
        200: tokenResponseSchema,
        400: errorSchema,
      },
    },
  }, async (request, reply) => {
    try {
      const result = await service.register(request.body);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ message });
    }
  });

  app.withTypeProvider<ZodTypeProvider>().post('/login', {
    schema: {
      body: loginSchema,
      response: {
        200: tokenResponseSchema,
        401: errorSchema,
      },
    },
  }, async (request, reply) => {
    try {
      const result = await service.login(request.body);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      reply.status(401).send({ message });
    }
  });
}
