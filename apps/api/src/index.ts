import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import fastifySocketIO from 'fastify-socket.io';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '@avine/core';
import { authRoutes } from './modules/auth/auth.routes';
import { uploadRoutes } from './modules/upload/upload.routes';
import { analysisRoutes } from './modules/analysis/analysis.routes';
import { exportRoutes } from './modules/export/export.routes';
import { spotifyRoutes } from './modules/spotify/spotify.routes';
import { setupStreamGateway } from './modules/stream/stream.gateway';

const server = Fastify({
  logger: true
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

async function main() {
  await server.register(cors, {
    origin: '*', // Configure for production later
  });

  await server.register(multipart, {
    limits: {
      fileSize: 1024 * 1024 * 100,
    }
  });

  await server.register(swagger, {
    swagger: {
      info: {
        title: 'Avine API',
        description: 'Audio Intelligence Platform API',
        version: '0.1.0',
      },
      host: 'localhost:3000',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/documentation',
  });

  await server.register(fastifySocketIO, {
    cors: {
      origin: '*', // Configure for production later
      methods: ['GET', 'POST'],
    },
  });

  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(uploadRoutes, { prefix: '/api' });
  await server.register(analysisRoutes, { prefix: '/api' });
  await server.register(exportRoutes, { prefix: '/api' });
  await server.register(spotifyRoutes, { prefix: '/api' });

  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  server.ready().then(() => {
    setupStreamGateway(server.io);
  });

  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
