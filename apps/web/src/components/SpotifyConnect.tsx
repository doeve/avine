/**
 * SpotifyConnect - Component for Spotify integration
 */

import { useState, useEffect } from 'react';
import { Button } from '@avine/ui';
import { api } from '../lib/api';
import { Music2, Loader2, ExternalLink, Unlink } from 'lucide-react';

interface SpotifyConnectProps {
  sessionId?: string;
}

interface SpotifyUser {
  display_name: string;
  id: string;
}

export function SpotifyConnect({ sessionId }: SpotifyConnectProps) {
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ url: string; added: number; notFound: number } | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data } = await api.get('/api/spotify/status');
      setConnected(data.connected);
      if (data.user) setUser(data.user);
    } catch (error) {
      console.error('Failed to check Spotify status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const { data } = await api.get('/api/spotify/auth');
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to get Spotify auth URL:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.delete('/api/spotify/disconnect');
      setConnected(false);
      setUser(null);
    } catch (error) {
      console.error('Failed to disconnect Spotify:', error);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!sessionId) return;
    
    setCreating(true);
    try {
      const { data } = await api.post('/api/spotify/playlist', { sessionId });
      setResult({
        url: data.playlistUrl,
        added: data.tracksAdded,
        notFound: data.tracksNotFound,
      });
    } catch (error) {
      console.error('Failed to create playlist:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking Spotify...</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleConnect}
        className="flex items-center gap-2"
      >
        <Music2 className="w-4 h-4 text-[#1DB954]" />
        Connect Spotify
      </Button>
    );
  }

  if (result) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm">
          <span className="text-green-500">{result.added} tracks</span>
          {result.notFound > 0 && (
            <span className="text-muted-foreground"> ({result.notFound} not found)</span>
          )}
        </div>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[#1DB954] hover:underline text-sm"
        >
          Open <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-sm">
        <div className="w-2 h-2 rounded-full bg-[#1DB954]" />
        <span className="text-muted-foreground">{user?.display_name}</span>
      </div>
      
      {sessionId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreatePlaylist}
          disabled={creating}
          className="flex items-center gap-2"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Music2 className="w-4 h-4 text-[#1DB954]" />
          )}
          Create Playlist
        </Button>
      )}
      
      <button
        onClick={handleDisconnect}
        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
        title="Disconnect Spotify"
      >
        <Unlink className="w-4 h-4" />
      </button>
    </div>
  );
}
