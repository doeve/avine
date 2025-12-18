import { useState } from 'react';
import { FileUpload } from '../../components/FileUpload';
import { api } from '../../lib/api';
import { Link2, Loader2, CheckCircle, AlertCircle, ArrowRight, Music } from 'lucide-react';
import { Button } from '@avine/ui';

export function UploadPage() {
  const [url, setUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlStatus, setUrlStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [urlMessage, setUrlMessage] = useState('');

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setUrlLoading(true);
    setUrlStatus('idle');
    setUrlMessage('');

    try {
      const { data } = await api.post('/audio-url', { url });
      setUrlStatus('success');
      setUrlMessage(`Processing started! Session ID: ${data.sessionId}`);
      setUrl('');
    } catch (err: any) {
      setUrlStatus('error');
      setUrlMessage(err.response?.data?.message || 'Failed to process URL');
    } finally {
      setUrlLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Upload Audio</h1>
        <p className="text-muted-foreground">
          Upload a file or paste a URL to identify tracks
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* File Upload Card */}
        <div className="p-6 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">File Upload</h2>
              <p className="text-sm text-muted-foreground">MP3, WAV, FLAC, M4A</p>
            </div>
          </div>
          <FileUpload />
        </div>

        {/* URL Input Card */}
        <div className="p-6 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">URL Import</h2>
              <p className="text-sm text-muted-foreground">YouTube, SoundCloud, etc.</p>
            </div>
          </div>

          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                disabled={urlLoading}
              />
            </div>

            {urlStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                {urlMessage}
              </div>
            )}

            {urlStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {urlMessage}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full gap-2" 
              disabled={!url.trim() || urlLoading}
            >
              {urlLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Analyze URL
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Supported Platforms */}
      <div className="p-6 rounded-xl border border-border bg-card/30">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Supported Platforms</h3>
        <div className="flex flex-wrap gap-3">
          {['YouTube', 'SoundCloud', 'Mixcloud', 'Bandcamp', 'Vimeo', 'Direct URLs'].map((platform) => (
            <span 
              key={platform}
              className="px-3 py-1.5 rounded-full bg-muted/50 text-sm text-muted-foreground"
            >
              {platform}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
