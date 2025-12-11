/**
 * Spotify Integration Service
 * Handles OAuth authentication and playlist creation
 */

import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { authenticate } from '../auth/auth.middleware';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback';

interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// In-memory token storage (use Redis or DB in production)
const userSpotifyTokens = new Map<string, SpotifyTokens & { expires_at: number }>();

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  
  if (data.access_token) {
    userSpotifyTokens.set(userId, {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000),
    });
    return data.access_token;
  }
  
  throw new Error('Failed to refresh Spotify token');
}

async function getSpotifyToken(userId: string): Promise<string | null> {
  const tokens = userSpotifyTokens.get(userId);
  if (!tokens) return null;
  
  if (Date.now() >= tokens.expires_at - 60000) {
    return refreshAccessToken(userId, tokens.refresh_token);
  }
  
  return tokens.access_token;
}

export async function spotifyRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>()
    
    // Get Spotify auth URL
    .get('/spotify/auth', {
      schema: {
        response: {
          200: z.object({
            url: z.string(),
          }),
        },
      },
    }, async (request, reply) => {
      await authenticate(request, reply);
      if (!request.user) return;

      const scopes = [
        'playlist-modify-public',
        'playlist-modify-private',
        'user-read-private',
      ].join(' ');

      const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: scopes,
        state: request.user.userId, // Use userId as state
      });

      return { url: `https://accounts.spotify.com/authorize?${params}` };
    })

    // Spotify OAuth callback
    .get('/spotify/callback', {
      schema: {
        querystring: z.object({
          code: z.string(),
          state: z.string(),
        }),
      },
    }, async (request, reply) => {
      const { code, state: userId } = request.query;

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
        }),
      });

      const data = await response.json();

      if (data.access_token) {
        userSpotifyTokens.set(userId, {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          expires_at: Date.now() + (data.expires_in * 1000),
        });

        // Redirect back to app
        return reply.redirect('http://localhost:5173/dashboard?spotify=connected');
      }

      return reply.status(400).send({ error: 'Failed to authenticate with Spotify' });
    })

    // Check Spotify connection status
    .get('/spotify/status', {
      schema: {
        response: {
          200: z.object({
            connected: z.boolean(),
            user: z.object({
              display_name: z.string(),
              id: z.string(),
            }).optional(),
          }),
        },
      },
    }, async (request, reply) => {
      await authenticate(request, reply);
      if (!request.user) return;

      const token = await getSpotifyToken(request.user.userId);
      if (!token) {
        return { connected: false };
      }

      try {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const user = await response.json();
        
        return {
          connected: true,
          user: {
            display_name: user.display_name,
            id: user.id,
          },
        };
      } catch {
        return { connected: false };
      }
    })

    // Create playlist from session tracks
    .post('/spotify/playlist', {
      schema: {
        body: z.object({
          sessionId: z.string().uuid(),
          name: z.string().optional(),
          description: z.string().optional(),
        }),
        response: {
          200: z.object({
            playlistId: z.string(),
            playlistUrl: z.string(),
            tracksAdded: z.number(),
            tracksNotFound: z.number(),
          }),
        },
      },
    }, async (request, reply) => {
      await authenticate(request, reply);
      if (!request.user) return;

      const { sessionId, name, description } = request.body;
      const token = await getSpotifyToken(request.user.userId);
      
      if (!token) {
        return reply.status(401).send({ error: 'Spotify not connected' } as any);
      }

      // Get session tracks from database
      const { db, sessions, tracks } = await import('@avine/core');
      const { eq } = await import('drizzle-orm');
      
      const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' } as any);
      }

      const sessionTracks = await db.select().from(tracks).where(eq(tracks.sessionId, sessionId));

      // Get Spotify user ID
      const meResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const me = await meResponse.json();

      // Create playlist
      const playlistName = name || `Avine - ${new Date().toLocaleDateString()}`;
      const createResponse = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistName,
          description: description || `Generated by Avine Audio Intelligence from ${session.sourceType}`,
          public: false,
        }),
      });
      const playlist = await createResponse.json();

      // Search and add tracks
      const spotifyUris: string[] = [];
      let notFound = 0;

      for (const track of sessionTracks) {
        const query = encodeURIComponent(`${track.artist} ${track.title}`);
        const searchResponse = await fetch(
          `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const searchResult = await searchResponse.json();

        if (searchResult.tracks?.items?.length > 0) {
          spotifyUris.push(searchResult.tracks.items[0].uri);
        } else {
          notFound++;
        }
      }

      // Add tracks to playlist
      if (spotifyUris.length > 0) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uris: spotifyUris }),
        });
      }

      return {
        playlistId: playlist.id,
        playlistUrl: playlist.external_urls.spotify,
        tracksAdded: spotifyUris.length,
        tracksNotFound: notFound,
      };
    })

    // Disconnect Spotify
    .delete('/spotify/disconnect', {
      schema: {
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    }, async (request, reply) => {
      await authenticate(request, reply);
      if (!request.user) return;

      userSpotifyTokens.delete(request.user.userId);
      return { success: true };
    });
}
