import React, { useState } from 'react';
import { ArrowLeft, User, Activity, Music, Radio } from 'lucide-react';
// import { Button } from '@avine/ui'; // Removed unused import


interface LiveListenScreenProps {
  onBack: () => void;
}

export function LiveListenScreen({ onBack }: LiveListenScreenProps) {
  const [isListening, setIsListening] = useState(false);
  const [showPopups, setShowPopups] = useState(true);
  const [detections, setDetections] = useState<any[]>([]);

  React.useEffect(() => {
    // Check initial state
    chrome.storage.local.get(['isListening', 'trackHistory'], (data) => {
      if (data.isListening) setIsListening(true);
      if (data.trackHistory && Array.isArray(data.trackHistory)) {
        setDetections(data.trackHistory);
      }
    });

    const listener = (message: any) => {
      if (message.type === 'RECOGNITION_RESULT') {
        const newTrack = {
          title: message.data.title,
          artist: message.data.artist,
          source: 'Live',
          sourceLabel: 'Detected',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isLive: true,
          artwork: null
        };
        
        setDetections(prev => {
          // Avoid duplicates
          const last = prev[0];
          if (last && last.title === newTrack.title && last.artist === newTrack.artist) return prev;
          
          const updated = [newTrack, ...prev].map((t, i) => i === 0 ? t : { ...t, isLive: false });
          chrome.storage.local.set({ trackHistory: updated });
          
          if (showPopups) {
             // We can trigger a chrome notification here if we had permission logic in background
          }
          return updated;
        });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    
    // Auto-start if not listening
    chrome.storage.local.get(['isListening'], (data) => {
       if (!data.isListening) toggleListening();
    });

    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const toggleListening = () => {
    if (isListening) {
      chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
      setIsListening(false);
      chrome.storage.local.set({ isListening: false });
    } else {
      chrome.runtime.sendMessage({ type: 'START_CAPTURE' });
      setIsListening(true);
      chrome.storage.local.set({ isListening: true });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-border/10 bg-card/30 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">A</span>
            </div>
            <span className="font-bold text-sm">Avine</span>
        </div>
        
        <div className="flex items-center gap-2">
             <div className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${isListening ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-muted text-muted-foreground'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                {isListening ? 'LISTENING' : 'PAUSED'}
             </div>
             <div className="w-7 h-7 rounded-full bg-orange-200 flex items-center justify-center">
                <User className="w-4 h-4 text-orange-700" />
             </div>
        </div>
      </div>

      {/* Sub-Header / Controls */}
      <div className="px-4 py-3 bg-muted/10 border-b border-border/5 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">Live Feed</h2>
            <span className="px-1.5 py-0.5 bg-card border border-border/20 rounded text-[9px] text-muted-foreground">Real-time</span>
         </div>
         
         <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Popups</span>
            <button 
              onClick={() => {
                const newState = !showPopups;
                setShowPopups(newState);
                chrome.storage.local.set({ showPopups: newState });
              }}
              className={`w-8 h-4 rounded-full p-0.5 transition-colors ${showPopups ? 'bg-green-500' : 'bg-muted'}`}
            >
               <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${showPopups ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </button>
         </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
         {detections.map((track, idx) => (
             <div 
                key={idx}
                className={`relative group rounded-lg border transition-all overflow-hidden
                    ${track.isLive 
                        ? 'bg-green-500/5 border-green-500/30' 
                        : 'bg-card/40 border-border/10 hover:bg-card/60'
                    }
                `}
             >
                {/* Active Indicator Strip */}
                {track.isLive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                )}

                <div className="p-3 flex items-center gap-3">
                    {/* Time / Status */}
                    <div className="w-12 shrink-0 flex flex-col items-center justify-center gap-1">
                        {track.isLive ? (
                            <span className="text-[10px] font-bold text-green-500">Now</span>
                        ) : (
                            <span className="text-[10px] text-muted-foreground">{track.timestamp}</span>
                        )}
                        
                        {/* Artwork placeholder */}
                        <div className="w-10 h-10 rounded bg-muted/30 flex items-center justify-center relative">
                            {track.isLive ? (
                                <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                            ) : (
                                <Music className="w-5 h-5 text-muted-foreground/50" />
                            )}
                            
                            {/* New Badge */}
                            {track.isLive && (
                                <div className="absolute -bottom-1 right-0 bg-green-500 text-[8px] text-black font-bold px-1 rounded-sm">NEW</div>
                            )}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold truncate leading-tight">{track.title}</h3>
                        <p className="text-xs text-muted-foreground truncate mb-2">{track.artist}</p>
                        
                        <div className="flex items-center justify-between">
                           {/* Source Badge */}
                            <div className="flex items-center gap-1.5 opacity-60">
                                {/* Icon based on source, generic for now */}
                                <Radio className="w-3 h-3 text-white" />
                                <span className="text-[9px] font-bold uppercase">{track.source}</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">{track.sourceLabel}</span>
                        </div>
                    </div>
                </div>
             </div>
         ))}
      </div>
      
      {/* Back Button Overlay */}
      <button 
         onClick={onBack}
         className="absolute bottom-4 left-4 p-2 rounded-full bg-card/80 backdrop-blur border border-border/20 shadow-lg text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

    </div>
  );
}
