import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { Button } from '@avine/ui';
import { FileUpload } from '../components/FileUpload';
import { ExportButton } from '../components/ExportButton';
import { SpotifyConnect } from '../components/SpotifyConnect';
import { api } from '../lib/api';
import { Loader2, Music, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Session {
  id: string;
  sourceType: string;
  sourceUrl: string | null;
  status: string;
  createdAt: string;
  duration: number | null;
}

interface Track {
  title: string;
  artist: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSessionClick = async (sessionId: string) => {
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
      return;
    }

    setSelectedSessionId(sessionId);
    setLoadingTracks(true);
    try {
      const { data } = await api.get(`/sessions/${sessionId}`);
      setSelectedTracks(data.tracks);
    } catch (error) {
      console.error('Failed to fetch tracks', error);
    } finally {
      setLoadingTracks(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Welcome, {user?.displayName}
            </span>
            <Button variant="outline" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Left Column: Upload & History */}
          <div className="md:col-span-1 space-y-4">
            
            {/* Upload Area */}
            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Upload Audio</h3>
              <FileUpload />
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">History</h3>
                <Button variant="ghost" size="sm" onClick={fetchSessions}>
                  Refresh
                </Button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No analysis history found.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSessionClick(session.id)}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedSessionId === session.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {session.sourceType === 'URL' ? 'URL Analysis' : 'File Upload'}
                        </span>
                        {session.status === 'COMPLETED' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {session.status === 'FAILED' && <AlertCircle className="w-4 h-4 text-red-500" />}
                        {session.status === 'PENDING' && <Clock className="w-4 h-4 text-yellow-500" />}
                        {session.status === 'PROCESSING' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {session.sourceUrl || session.id}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="md:col-span-2">
            <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm h-full min-h-[500px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Analysis Results</h3>
                {selectedSessionId && selectedTracks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <SpotifyConnect sessionId={selectedSessionId} />
                    <ExportButton sessionId={selectedSessionId} />
                  </div>
                )}
              </div>
              
              {!selectedSessionId ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Music className="w-12 h-12 mb-4 opacity-20" />
                  <p>Select a session to view results</p>
                </div>
              ) : loadingTracks ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : selectedTracks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No tracks detected in this session.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedTracks.map((track, index) => (
                    <div key={index} className="flex items-center p-4 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4 shrink-0">
                        <Music className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{track.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="font-mono text-sm font-medium">
                          {formatTime(track.startTime)} - {formatTime(track.endTime)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {track.confidence}% Match
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
