import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';

export interface UserPayload {
  userId: string;
  email: string;
  tier: 'FREE' | 'PRO' | 'UNLIMITED';
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.status(401).send({ message: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ message: 'Invalid token' });
  }
}
