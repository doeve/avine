import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Music } from 'lucide-react';
import { Button } from '@avine/ui';

interface ScanMixScreenProps {
  onBack: () => void;
}

export function ScanMixScreen({ onBack }: ScanMixScreenProps) {
  const [mediaData, setMediaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([
    // Placeholder data for now, will be replaced by actual recognition
    { startTime: '00:00', endTime: '04:20', title: 'Kyle (I found you)', artist: 'Fred again..' },
    { startTime: '04:20', endTime: '07:15', title: 'Bleuu (Dye)', artist: 'Fred again..' },
  ]);

  useEffect(() => {
    // Query active tab for media
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'SCAN_MEDIA' }, (response) => {
           setLoading(false);
           if (chrome.runtime.lastError) {
             setError('Could not connect to page. Refresh?');
             return;
           }
           if (response && response.found) {
             setMediaData(response);
             if (response.tracks && response.tracks.length > 0) {
               // Transform tracks to have start/end logic
               const processTracks = response.tracks.map((t: any, i: number) => ({
                 startTime: t.timestampStr,
                 endTime: response.tracks[i+1]?.timestampStr || formatDuration(response.duration),
                 title: t.title,
                 artist: t.artist
               }));
               setTracks(processTracks);
             }
           } else {
             setError('No media found on this page.');
           }
        });
      } else {
        setLoading(false);
        setError('No active tab.');
      }
    });
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-border/10 bg-card/30 backdrop-blur-sm z-10">
        <button 
          onClick={onBack}
          className="p-1.5 -ml-1.5 hover:bg-muted rounded-full transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="font-bold text-sm">Scan Mix</span>
        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Media Preview */}
        <div className="p-4 border-b border-border/10">
          {loading ? (
             <div className="flex items-center justify-center p-4 text-xs text-muted-foreground animate-pulse">Scanning page...</div>
          ) : error ? (
             <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs text-center">{error}</div>
          ) : mediaData ? (
             <div className="flex gap-3">
                <div className="w-24 aspect-video rounded-lg bg-gray-800 relative overflow-hidden flex items-center justify-center shrink-0">
                   <div className="absolute top-1 left-1 px-1 py-0.5 bg-red-600 rounded text-[8px] font-bold text-white flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      LIVE
                   </div>
                   <Music className="text-white/50 w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-primary text-[9px] text-primary-foreground px-1 py-0.5 rounded font-bold uppercase">{mediaData.platform}</span>
                  </div>
                  <h3 className="text-xs font-bold leading-tight mb-1 line-clamp-2">{mediaData.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{formatDuration(mediaData.duration)} duration</p>
                  <p className="text-[10px] text-muted-foreground">{tracks.length} tracks recognized</p>
                </div>
             </div>
          ) : null}
        </div>

        {/* Track List */}
        <div className="pb-20"> {/* Padding for fixed bottom button */}
            {/* Table Header */}
            <div className="grid grid-cols-[80px_1fr] px-4 py-2 border-b border-border/10 text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-muted/20">
              <div>Time</div>
              <div className="flex justify-between">
                <span>Track Name</span>
                <span>Artist</span>
              </div>
            </div>

            {/* Rows */}
            <div className="text-xs">
              {tracks.map((track, idx) => (
                <div key={idx} className="grid grid-cols-[80px_1fr] px-4 py-3 border-b border-border/5 hover:bg-muted/10 transition-colors group">
                  <div className="flex items-center text-[10px] text-green-500 font-mono tracking-tighter">
                    {track.startTime} <span className="text-muted-foreground/30 mx-1">-</span> {track.endTime}
                  </div>
                  <div className="flex items-center justify-between min-w-0 gap-2">
                    <span className="font-medium truncate text-foreground/90">{track.title}</span>
                    <span className="text-muted-foreground text-[10px] truncate shrink-0 max-w-[80px] text-right">{track.artist}</span>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
         <div className="pointer-events-auto">
           <Button 
             onClick={() => {
               const text = tracks.map(t => `[${t.startTime}] ${t.title} - ${t.artist}`).join('\n');
               navigator.clipboard.writeText(text);
               // Maybe show toast? For now just visual feedback could be improved but logical is done.
             }}
             className="w-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-900/20"
           >
             <ExternalLink className="w-4 h-4 mr-2" />
             Export Tracklist
           </Button>
         </div>
      </div>
    </div>
  );
}
