import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { ExportButton } from '../../components/ExportButton';
import { SpotifyConnect } from '../../components/SpotifyConnect';
import { 
  Loader2, 
  Music, 
  ArrowLeft,
  Clock,
  CheckCircle,
  Calendar,
  Link2,
  FileAudio
} from 'lucide-react';
import { Button } from '@avine/ui';

interface Track {
  title: string;
  artist: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface SessionDetail {
  id: string;
  sourceType: string;
  sourceUrl: string | null;
  status: string;
  createdAt: string;
  duration: number | null;
  tracks: Track[];
}

export function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSession(id);
    }
  }, [id]);

  const fetchSession = async (sessionId: string) => {
    try {
      const { data } = await api.get(`/sessions/${sessionId}`);
      setSession(data);
    } catch (error) {
      console.error('Failed to fetch session', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <Music className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">Session not found</p>
        <Link to="/dashboard/history" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Back to History</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Link 
        to="/dashboard/history"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to History
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {session.sourceType === 'URL' ? (
              <Link2 className="w-6 h-6 text-primary" />
            ) : (
              <FileAudio className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {session.sourceType === 'URL' ? 'URL Analysis' : 'File Upload'}
            </h1>
            <p className="text-sm text-muted-foreground truncate max-w-lg">
              {session.sourceUrl || session.id}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(session.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(session.createdAt).toLocaleTimeString()}
              </span>
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle className="w-3.5 h-3.5" />
                {session.status}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <SpotifyConnect sessionId={session.id} />
          <ExportButton sessionId={session.id} />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="text-2xl font-bold text-primary">{session.tracks?.length || 0}</div>
          <div className="text-sm text-muted-foreground">Tracks Found</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="text-2xl font-bold">
            {session.duration ? formatTime(session.duration) : '--:--'}
          </div>
          <div className="text-sm text-muted-foreground">Duration</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="text-2xl font-bold">
            {session.tracks?.length ? Math.round(session.tracks.reduce((acc, t) => acc + t.confidence, 0) / session.tracks.length) : 0}%
          </div>
          <div className="text-sm text-muted-foreground">Avg Confidence</div>
        </div>
      </div>

      {/* Tracks List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Identified Tracks</h2>
        {!session.tracks?.length ? (
          <div className="text-center py-12 rounded-xl border border-border bg-card/50">
            <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No tracks detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {session.tracks.map((track, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors"
              >
                {/* Index */}
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-sm font-mono text-muted-foreground shrink-0">
                  {index + 1}
                </div>

                {/* Album Art Placeholder */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-primary" />
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{track.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>

                {/* Time Range */}
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm">
                    {formatTime(track.startTime)} – {formatTime(track.endTime)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {track.confidence}% match
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
