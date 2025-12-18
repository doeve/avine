import { FastifyPluginAsync } from 'fastify';
import { db } from '@avine/core';
import { libraryTracks, tracks, sessions } from '@avine/core';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../auth/auth.middleware';

export const libraryRoutes: FastifyPluginAsync = async (fastify) => {
  // Get user's track library
  fastify.get('/library', async (request, reply) => {
    await authenticate(request, reply);
    if (!request.user) return;
    const userId = request.user.userId;

    const library = await db
      .select()
      .from(libraryTracks)
      .where(eq(libraryTracks.userId, userId))
      .orderBy(desc(libraryTracks.playCount));

    return library;
  });

  // Get library statistics
  fastify.get('/library/stats', async (request, reply) => {
    await authenticate(request, reply);
    if (!request.user) return;
    const userId = request.user.userId;

    const [stats] = await db
      .select({
        totalTracks: sql<number>`count(*)`,
        totalPlays: sql<number>`sum(${libraryTracks.playCount})`,
      })
      .from(libraryTracks)
      .where(eq(libraryTracks.userId, userId));

    // Get top artist
    const [topArtist] = await db
      .select({
        artist: libraryTracks.artist,
        count: sql<number>`sum(${libraryTracks.playCount})`,
      })
      .from(libraryTracks)
      .where(eq(libraryTracks.userId, userId))
      .groupBy(libraryTracks.artist)
      .orderBy(desc(sql`sum(${libraryTracks.playCount})`))
      .limit(1);

    return {
      totalTracks: Number(stats?.totalTracks ?? 0),
      totalPlays: Number(stats?.totalPlays ?? 0),
      topArtist: topArtist?.artist ?? null,
    };
  });

  // Rebuild library from sessions (recalculate from all session tracks)
  fastify.post('/library/rebuild', async (request, reply) => {
    await authenticate(request, reply);
    if (!request.user) return;
    const userId = request.user.userId;

    // Get all tracks from user's sessions
    const userTracks = await db
      .select({
        title: tracks.title,
        artist: tracks.artist,
        album: tracks.album,
      })
      .from(tracks)
      .innerJoin(sessions, eq(tracks.sessionId, sessions.id))
      .where(eq(sessions.userId, userId));

    // Aggregate by title+artist
    const aggregated = new Map<string, { title: string; artist: string; album: string | null; count: number }>();
    
    for (const track of userTracks) {
      const key = `${track.title.toLowerCase()}|${track.artist.toLowerCase()}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.count++;
      } else {
        aggregated.set(key, {
          title: track.title,
          artist: track.artist,
          album: track.album,
          count: 1,
        });
      }
    }

    // Clear existing library
    await db.delete(libraryTracks).where(eq(libraryTracks.userId, userId));

    // Insert aggregated tracks
    const now = new Date();
    const entries = Array.from(aggregated.values()).map((t) => ({
      userId,
      title: t.title,
      artist: t.artist,
      album: t.album,
      playCount: t.count,
      lastSeenAt: now,
      firstSeenAt: now,
    }));

    if (entries.length > 0) {
      await db.insert(libraryTracks).values(entries);
    }

    return { rebuilt: entries.length };
  });
};
