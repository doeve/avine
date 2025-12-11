import 'fastify';
import { Server } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
  interface FastifyRequest {
    user: {
      userId: string;
      email: string;
      tier: 'FREE' | 'PRO' | 'UNLIMITED';
    };
  }
}
