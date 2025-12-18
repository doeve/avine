import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { 
  Loader2, 
  Music, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  Calendar,
  ArrowRight,
  Trash2,
  Puzzle,
  Upload,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@avine/ui';

interface Session {
  id: string;
  sourceType: string;
  sourceUrl: string | null;
  status: string;
  createdAt: string;
  duration: number | null;
}

export function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

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

  const filteredSessions = sessions.filter(session => 
    session.sourceUrl?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'PROCESSING': return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Completed';
      case 'FAILED': return 'Failed';
      case 'PENDING': return 'Pending';
      case 'PROCESSING': return 'Processing';
      default: return status;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">History</h1>
          <p className="text-muted-foreground">
            Browse and manage your analysis sessions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSessions} className="gap-2">
          <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No sessions found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {searchQuery ? 'Try a different search' : 'Upload an audio file to get started'}
          </p>
          {!searchQuery && (
            <Link to="/dashboard/upload" className="mt-4 inline-block">
              <Button size="sm">Upload Audio</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <Link
              key={session.id}
              to={`/dashboard/session/${session.id}`}
              className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-200"
            >
              {/* Icon - varies by source type */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                session.sourceType === 'BROWSER_EXTENSION' 
                  ? 'bg-primary/10' 
                  : 'bg-muted/50'
              }`}>
                {session.sourceType === 'BROWSER_EXTENSION' ? (
                  <Puzzle className="w-5 h-5 text-primary" />
                ) : session.sourceType === 'URL' ? (
                  <LinkIcon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {session.sourceType === 'BROWSER_EXTENSION' 
                      ? 'Extension Session' 
                      : session.sourceType === 'URL' 
                        ? 'URL Analysis' 
                        : 'File Upload'}
                  </span>
                  {session.sourceType === 'BROWSER_EXTENSION' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                      EXT
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                    {getStatusIcon(session.status)}
                    {getStatusLabel(session.status)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {session.sourceUrl || session.id}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Implement delete
                  }}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
