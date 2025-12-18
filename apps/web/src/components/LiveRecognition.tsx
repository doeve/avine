/**
 * LiveRecognition - Real-time audio recognition panel
 * ported from extension's Popup.tsx to match Premium Navy design
 */

import { useRealTimeRecognition } from '../hooks/useRealTimeRecognition';
import { Music, Mic, StopCircle, Bell, Upload } from 'lucide-react';
import { useState } from 'react';

// Color constants matching exact design spec from extension
const COLORS = {
  header: '#0f0f10',
  preview: '#18181b',
  separator: '#191c23',
  tracklist: '#18181b',
  trackActive: '#202022',
  footer: '#0f0f10',
  text: '#ffffff',
  textMuted: '#8B949E',
  accent: '#00C853',
  accentRed: '#F85149',
};

export function LiveRecognition() {
  const {
    currentTrack,
    trackHistory,
    isRecording,
    connect,
    startRecording,
    stopRecording,
    connected
  } = useRealTimeRecognition();

  // Notifications state (local only for UI, mostly placeholder for web unless implemented)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const toggleListening = () => {
    if (isRecording) {
      stopRecording();
      // Optionally disconnect to save resources, but keeping connected allows faster restart
    } else {
      if (!connected) connect();
      startRecording();
    }
  };

  const handleExport = () => {
    const text = trackHistory
      .map(t => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.title} - ${t.artist}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Song Preview Section - #18181b */}
      <div className="px-3 py-3 rounded-t-xl" style={{ backgroundColor: COLORS.preview }}>
        <div className="flex gap-3">
          {/* Album Art */}
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center shrink-0 relative">
            <Music className="w-6 h-6 text-white/80" />
            <div className="absolute bottom-0.5 left-0.5 bg-black text-[7px] font-bold px-1 py-0.5 rounded-sm text-white flex items-center gap-0.5">
              <span className="text-[6px]">■</span>
              WEB
            </div>
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isRecording && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#00C853] uppercase tracking-wide">
                    Listening...
                  </span>
                </>
              )}
            </div>
            <h3 className="text-sm font-semibold truncate leading-tight text-white">
              {currentTrack?.title || 'Waiting for audio...'}
            </h3>
            <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>
              {currentTrack?.artist || 'Start listening to identify tracks'}
            </p>
          </div>
        </div>

        {/* Stop/Start Button */}
        <div className="mt-3">
          <button
            onClick={toggleListening}
            className={`w-full h-9 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
              isRecording
                ? 'border border-[#F85149] text-[#F85149]'
                : 'bg-[#00C853] text-[#0D1117] hover:bg-[#00E676]'
            }`}
            style={isRecording ? { backgroundColor: 'rgba(248, 81, 73, 0.1)' } : {}}
          >
            {isRecording ? (
              <>
                <StopCircle className="w-3.5 h-3.5" />
                STOP LISTENING
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                START LISTENING
              </>
            )}
          </button>
        </div>
      </div>

      {/* Session Feed Separator - #191c23 */}
      <div 
        className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: COLORS.separator }}
      >
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
          Session Feed
        </span>
        {isRecording && (
          <span 
            className="text-[10px] font-medium text-white px-1.5 py-0.5 rounded"
            style={{ backgroundColor: '#2a2d35' }}
          >
            Live
          </span>
        )}
        {!isRecording && trackHistory.length > 0 && (
          <span 
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: '#2a2d35', color: COLORS.textMuted }}
          >
            {trackHistory.length} tracks
          </span>
        )}
      </div>

      {/* Track List - #18181b background */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ backgroundColor: COLORS.tracklist }}
      >
        {trackHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
            <Music className="w-8 h-8 opacity-20" style={{ color: COLORS.textMuted }} />
            <p className="text-xs" style={{ color: COLORS.textMuted }}>
              {isRecording ? 'Identifying tracks...' : 'No tracks identified yet'}
            </p>
            <p className="text-[10px]" style={{ color: COLORS.textMuted, opacity: 0.6 }}>
              {isRecording ? 'Results will appear here' : 'Start listening to identify songs'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {[...trackHistory].reverse().map((track, idx) => (
              <TrackRow key={idx} track={track} />
            ))}
          </div>
        )}
      </div>

      {/* Footer - #0f0f10 */}
      <div className="rounded-b-xl" style={{ backgroundColor: COLORS.footer }}>
        {/* Notifications Toggle */}
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" style={{ color: COLORS.textMuted }} />
            <span className="text-xs" style={{ color: COLORS.textMuted }}>Desktop Notifications</span>
          </div>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
              notificationsEnabled ? 'bg-[#00C853]' : 'bg-[#30363D]'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Export Button */}
        <div className="px-3 pb-3 pt-1">
          <button
            onClick={handleExport}
            className="w-full h-10 rounded-md bg-white text-[#0D1117] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            EXPORT SESSION
          </button>
        </div>
      </div>
    </div>
  );
}

function TrackRow({ track }: { track: any }) {
  // Assuming the hook might not match the extension's EXACT Track interface, adapting:
  const timestampStr = new Date(track.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors mx-2 rounded-md">
      {/* Timestamp Badge */}
      <span 
        className="text-[10px] font-mono px-2 py-1 rounded shrink-0"
        style={{ backgroundColor: '#2a2d35', color: '#8B949E' }}
      >
        {timestampStr}
      </span>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold truncate leading-tight text-white">
          {track.title}
        </h4>
        <p className="text-[10px] truncate" style={{ color: '#8B949E' }}>
          {track.artist}
        </p>
      </div>
    </div>
  );
}
