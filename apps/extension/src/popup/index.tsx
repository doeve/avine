import React from 'react';
import ReactDOM from 'react-dom/client';
import { useState, useEffect } from 'react';
import { Button } from '@avine/ui';
import '../index.css';

interface TrackResult {
  title: string;
  artist: string;
  confidence: number;
  timestamp?: number;
}

export default function Popup() {
  const [isListening, setIsListening] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TrackResult | null>(null);
  const [trackHistory, setTrackHistory] = useState<TrackResult[]>([]);

  useEffect(() => {
    // Load saved state
    chrome.storage.local.get(['trackHistory', 'currentTrack', 'isListening'], (data) => {
      if (data.trackHistory) setTrackHistory(data.trackHistory as TrackResult[]);
      if (data.currentTrack) setCurrentTrack(data.currentTrack as TrackResult);
      if (typeof data.isListening === 'boolean') setIsListening(data.isListening);
    });

    // Listen for results
    const listener = (message: any) => {
      if (message.type === 'RECOGNITION_RESULT') {
        const newTrack: TrackResult = {
          ...message.data,
          timestamp: Date.now(),
        };
        setCurrentTrack(newTrack);
        
        // Add to history if different from last
        setTrackHistory(prev => {
          const last = prev[prev.length - 1];
          if (!last || last.title !== newTrack.title || last.artist !== newTrack.artist) {
            const updated = [...prev, newTrack];
            chrome.storage.local.set({ trackHistory: updated, currentTrack: newTrack });
            return updated;
          }
          return prev;
        });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
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

  const clearHistory = () => {
    setTrackHistory([]);
    setCurrentTrack(null);
    chrome.storage.local.set({ trackHistory: [], currentTrack: null });
  };

  const copyToClipboard = () => {
    const text = trackHistory
      .map((t, i) => `${i + 1}. ${t.artist} - ${t.title}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="w-[380px] min-h-[400px] bg-gradient-to-b from-background to-background/95">
      {/* Header */}
      <div className="p-4 border-b bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="text-base font-bold">Avine</h1>
              <p className="text-xs text-muted-foreground">Audio Intelligence</p>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Control Button */}
        <Button 
          onClick={toggleListening} 
          variant={isListening ? "destructive" : "default"}
          className="w-full h-12 text-base font-medium"
        >
          {isListening ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Stop Listening
            </span>
          ) : (
            'Start Listening'
          )}
        </Button>

        {/* Now Playing */}
        {currentTrack && isListening && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex items-center gap-1 text-xs text-primary font-medium mb-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              NOW PLAYING
            </div>
            <div className="font-semibold text-lg leading-tight">{currentTrack.title}</div>
            <div className="text-muted-foreground text-sm">{currentTrack.artist}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${currentTrack.confidence}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{currentTrack.confidence}%</span>
            </div>
          </div>
        )}

        {/* Track History */}
        {trackHistory.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Detected ({trackHistory.length})
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={copyToClipboard}
                  className="text-xs text-primary hover:underline px-2 py-1"
                >
                  Copy
                </button>
                <button 
                  onClick={clearHistory}
                  className="text-xs text-destructive hover:underline px-2 py-1"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...trackHistory].reverse().map((track, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-card/50 border hover:bg-card transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <span className="text-xs font-medium">{trackHistory.length - idx}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{track.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
                  </div>
                  {track.timestamp && (
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatTime(track.timestamp)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isListening && trackHistory.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
              <svg 
                className="w-6 h-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" 
                />
              </svg>
            </div>
            <p className="text-sm">Click "Start Listening" to detect music</p>
            <p className="text-xs mt-1">from the current tab</p>
          </div>
        )}

        {/* Listening State */}
        {isListening && !currentTrack && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-primary/50 animate-ping animation-delay-200" />
              <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="w-4 h-4 bg-primary rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-sm">Listening for music...</p>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
