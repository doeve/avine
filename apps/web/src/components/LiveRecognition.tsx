/**
 * LiveRecognition - Real-time audio recognition panel
 */

import { Button } from '@avine/ui';
import { useRealTimeRecognition } from '../hooks/useRealTimeRecognition';
import { Mic, MicOff, Radio, Music, Wifi, WifiOff } from 'lucide-react';

export function LiveRecognition() {
  const {
    connected,
    status,
    currentTrack,
    trackHistory,
    isRecording,
    connect,
    disconnect,
    startRecording,
    stopRecording,
  } = useRealTimeRecognition();

  const handleToggleConnection = () => {
    if (connected) {
      stopRecording();
      disconnect();
    } else {
      connect();
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      {/* Connection Status & Controls */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <div>
            <div className="font-medium text-sm">
              {connected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="text-xs text-muted-foreground">
              {status.message || 'Click connect to start'}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleConnection}
          >
            {connected ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
          </Button>
          
          {connected && (
            <Button
              variant={isRecording ? 'destructive' : 'default'}
              size="sm"
              onClick={handleToggleRecording}
              className="flex items-center gap-2"
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Start
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Now Playing */}
      {currentTrack && isRecording && (
        <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-2 text-xs text-primary mb-2">
            <Radio className="w-3 h-3 animate-pulse" />
            NOW PLAYING
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
              <Music className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{currentTrack.title}</div>
              <div className="text-sm text-muted-foreground truncate">{currentTrack.artist}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-primary">{currentTrack.confidence}%</div>
              <div className="text-xs text-muted-foreground">confidence</div>
            </div>
          </div>
        </div>
      )}

      {/* Track History */}
      {trackHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Detected Tracks ({trackHistory.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...trackHistory].reverse().map((track, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-primary/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{track.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {formatTime(track.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isRecording && trackHistory.length === 0 && !currentTrack && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-ping absolute" />
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative">
              <Mic className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="mt-4 text-sm">Listening for music...</p>
        </div>
      )}
    </div>
  );
}
