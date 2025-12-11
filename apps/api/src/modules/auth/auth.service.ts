import { db, users } from '@avine/core';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { registerSchema, loginSchema } from './auth.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';

export class AuthService {
  async register(data: z.infer<typeof registerSchema>) {
    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).execute();
    if (existingUser.length > 0) {
      throw new Error('User already exists');
    }

    const passwordHash = await argon2.hash(data.password);
    const [user] = await db.insert(users).values({
      email: data.email,
      passwordHash,
      displayName: data.displayName,
    }).returning().execute();

    return this.generateTokens(user);
  }

  async login(data: z.infer<typeof loginSchema>) {
    const [user] = await db.select().from(users).where(eq(users.email, data.email)).execute();
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, data.password);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  private generateTokens(user: typeof users.$inferSelect) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, tier: user.tier },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        tier: user.tier as 'FREE' | 'PRO' | 'UNLIMITED',
      },
    };
  }
}
