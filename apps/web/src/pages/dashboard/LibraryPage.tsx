import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { 
  Music, 
  Search, 
  Loader2,
  Play,
  Heart,
  MoreHorizontal,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Button } from '@avine/ui';

interface LibraryTrack {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  playCount: number;
  lastSeenAt: string;
  firstSeenAt: string;
}

interface LibraryStats {
  totalTracks: number;
  totalPlays: number;
  topArtist: string | null;
}

export function LibraryPage() {
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [stats, setStats] = useState<LibraryStats>({ totalTracks: 0, totalPlays: 0, topArtist: null });
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'playCount' | 'lastSeenAt' | 'title'>('playCount');

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      const [tracksRes, statsRes] = await Promise.all([
        api.get('/library'),
        api.get('/library/stats'),
      ]);
      setTracks(tracksRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch library', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      await api.post('/library/rebuild');
      await fetchLibrary();
    } catch (error) {
      console.error('Failed to rebuild library', error);
    } finally {
      setRebuilding(false);
    }
  };

  const filteredTracks = tracks
    .filter(track => 
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'playCount') return b.playCount - a.playCount;
      if (sortBy === 'lastSeenAt') return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
      return a.title.localeCompare(b.title);
    });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Track Library</h1>
          <p className="text-muted-foreground">
            All tracks identified across your sessions
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Music className="w-4 h-4" />
            <span className="text-sm">Unique Tracks</span>
          </div>
          <div className="text-2xl font-bold">{tracks.length}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Plays</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalPlays}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Heart className="w-4 h-4" />
            <span className="text-sm">Top Artist</span>
          </div>
          <div className="text-2xl font-bold truncate">
            {stats.topArtist || '-'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tracks or artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="playCount">Most Played</option>
          <option value="lastSeenAt">Recently Seen</option>
          <option value="title">Alphabetical</option>
        </select>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRebuild}
          disabled={rebuilding}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${rebuilding ? 'animate-spin' : ''}`} />
          Rebuild
        </Button>
      </div>

      {/* Tracks List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No tracks found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {searchQuery ? 'Try a different search' : 'Upload audio to build your library'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTracks.map((track, index) => (
            <div
              key={`${track.title}-${track.artist}`}
              className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-200"
            >
              {/* Index / Play */}
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <span className="group-hover:hidden">{index + 1}</span>
                <Play className="w-4 h-4 hidden group-hover:block fill-current" />
              </div>

              {/* Album Art */}
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-primary" />
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{track.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
              </div>

              {/* Stats */}
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-sm font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  {track.playCount} plays
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Last: {new Date(track.lastSeenAt).toLocaleDateString()}
                </div>
              </div>

              {/* Actions */}
              <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
