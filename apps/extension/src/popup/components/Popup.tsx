import { useState, useEffect } from 'react';
import { Settings, Music, Mic, Disc, StopCircle, Upload, Download, Bell, ExternalLink } from 'lucide-react';

type TabMode = 'scan-mix' | 'live-listen';

interface Track {
  timestamp: string;
  title: string;
  artist: string;
  isLive?: boolean;
}

interface ScanProgress {
  current: number;
  total: number;
}

interface MediaData {
  title: string;
  platform: string;
  duration: number;
}

// Custom Wave Icon for header (matching target design)
function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="9" width="3" height="6" rx="1" />
      <rect x="7" y="5" width="3" height="14" rx="1" />
      <rect x="12" y="7" width="3" height="10" rx="1" />
      <rect x="17" y="4" width="3" height="16" rx="1" />
    </svg>
  );
}

export function Popup() {
  const [activeTab, setActiveTab] = useState<TabMode>('live-listen');
  const [isListening, setIsListening] = useState(false);
  const [isScanning] = useState(false);
  const [scanProgress] = useState<ScanProgress>({ current: 0, total: 0 });
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [mediaData, setMediaData] = useState<MediaData | null>(null);

  // Load initial state from storage
  useEffect(() => {
    chrome.storage.local.get(['isListening', 'trackHistory', 'notificationsEnabled', 'activeTab'], (data) => {
      if (data.isListening) setIsListening(true);
      if (data.trackHistory && Array.isArray(data.trackHistory)) {
        setTracks(data.trackHistory);
        const last = data.trackHistory[0];
        if (last?.isLive) setCurrentTrack(last);
      }
      if (typeof data.notificationsEnabled === 'boolean') {
        setNotificationsEnabled(data.notificationsEnabled);
      }
      if (data.activeTab === 'scan-mix' || data.activeTab === 'live-listen') {
        setActiveTab(data.activeTab);
      }
    });

    // Scan page for media context
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'SCAN_MEDIA' }, (response) => {
          if (response?.found) {
            setMediaData({
              title: response.title,
              platform: response.platform || 'TAB',
              duration: response.duration
            });
          }
        });
      }
    });

    // Listen for recognition results
    const listener = (message: any) => {
      if (message.type === 'RECOGNITION_RESULT') {
        handleNewDetection(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Persist tracks and settings
  useEffect(() => {
    if (tracks.length > 0) {
      chrome.storage.local.set({ trackHistory: tracks });
    }
  }, [tracks]);

  useEffect(() => {
    chrome.storage.local.set({ activeTab });
  }, [activeTab]);

  const handleNewDetection = (data: any) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newTrack: Track = {
      timestamp: timeStr,
      title: data.title,
      artist: data.artist,
      isLive: true
    };

    setTracks(prev => {
      // Avoid duplicates
      const last = prev[0];
      if (last?.title === newTrack.title && last?.artist === newTrack.artist) {
        return prev;
      }
      // Mark previous tracks as not live
      const updated = prev.map(t => ({ ...t, isLive: false }));
      return [newTrack, ...updated];
    });

    setCurrentTrack(newTrack);
  };

  const toggleListening = () => {
    const newState = !isListening;
    setIsListening(newState);
    chrome.storage.local.set({ isListening: newState });
    
    if (newState) {
      chrome.runtime.sendMessage({ type: 'START_CAPTURE' });
    } else {
      chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
      setCurrentTrack(null);
    }
  };

  const toggleNotifications = () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    chrome.storage.local.set({ notificationsEnabled: newState });
  };

  const handleExport = () => {
    const text = tracks
      .map(t => `[${t.timestamp}] ${t.title} - ${t.artist}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  // Main background color - uniform throughout
  const BG_MAIN = '#0F1419';
  const BG_CARD = '#161B22';
  const TEXT_MUTED = '#8B949E';

  return (
    <div className="w-[320px] h-[520px] flex flex-col text-white overflow-hidden" style={{ backgroundColor: BG_MAIN }}>
      {/* Header - Same background as main, no distinct color */}
      <header className="h-10 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <WaveIcon className="w-4 h-4 text-[#00C853]" />
          <span className="text-sm font-semibold">Avine</span>
        </div>
        <button className="p-1 hover:bg-white/5 rounded transition-colors">
          <Settings className="w-3.5 h-3.5 text-[#6B7280]" />
        </button>
      </header>

      {/* Mode Tabs - In a card container */}
      <div className="px-3 pb-3">
        <div className="flex rounded-lg p-0.5" style={{ backgroundColor: BG_CARD }}>
          <button
            onClick={() => setActiveTab('scan-mix')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === 'scan-mix'
                ? 'bg-[#2D333B] text-white'
                : 'text-[#8B949E] hover:text-white'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            Scan Mix
          </button>
          <button
            onClick={() => setActiveTab('live-listen')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === 'live-listen'
                ? 'bg-[#2D333B] text-white'
                : 'text-[#8B949E] hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Live Listen
          </button>
        </div>
      </div>

      {/* Content Area - Same background as main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'live-listen' ? (
          <LiveListenContent
            isListening={isListening}
            currentTrack={currentTrack}
            tracks={tracks}
            notificationsEnabled={notificationsEnabled}
            onToggleListening={toggleListening}
            onToggleNotifications={toggleNotifications}
            onExport={handleExport}
            bgMain={BG_MAIN}
            bgCard={BG_CARD}
            textMuted={TEXT_MUTED}
          />
        ) : (
          <ScanMixContent
            isScanning={isScanning}
            scanProgress={scanProgress}
            mediaData={mediaData}
            tracks={tracks}
            onExport={handleExport}
            bgMain={BG_MAIN}
            bgCard={BG_CARD}
            textMuted={TEXT_MUTED}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================
   Live Listen Content
   ============================================ */

interface LiveListenContentProps {
  isListening: boolean;
  currentTrack: Track | null;
  tracks: Track[];
  notificationsEnabled: boolean;
  onToggleListening: () => void;
  onToggleNotifications: () => void;
  onExport: () => void;
  bgMain: string;
  bgCard: string;
  textMuted: string;
}

function LiveListenContent({
  isListening,
  currentTrack,
  tracks,
  notificationsEnabled,
  onToggleListening,
  onToggleNotifications,
  onExport,
  bgCard,
  textMuted
}: LiveListenContentProps) {
  return (
    <>
      {/* Player Section - NO card wrapper, sits directly on main bg */}
      <div className="px-3 pb-3">
        <div className="flex gap-3">
          {/* Album Art - Small ~56px, TAB badge bottom-LEFT */}
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center shrink-0 relative">
            <Music className="w-6 h-6 text-white/80" />
            {/* TAB Badge - Bottom LEFT */}
            <div className="absolute bottom-0.5 left-0.5 bg-black text-[7px] font-bold px-1 py-0.5 rounded-sm text-white flex items-center gap-0.5">
              <span className="text-[6px]">■</span>
              TAB
            </div>
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isListening && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#00C853] uppercase tracking-wide">
                    Listening...
                  </span>
                </>
              )}
            </div>
            <h3 className="text-sm font-semibold truncate leading-tight">
              {currentTrack?.title || 'Waiting for audio...'}
            </h3>
            <p className="text-xs truncate" style={{ color: textMuted }}>
              {currentTrack?.artist || 'Start listening to identify tracks'}
            </p>
          </div>
        </div>
      </div>

      {/* Stop/Start Button - Ghost/outlined style with subtle red fill */}
      <div className="px-3 pb-3">
        <button
          onClick={onToggleListening}
          className={`w-full h-9 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
            isListening
              ? 'border border-[#F85149] text-[#F85149] hover:bg-[#F8514910]'
              : 'bg-[#00C853] text-[#0D1117] hover:bg-[#00E676]'
          }`}
          style={isListening ? { backgroundColor: 'rgba(248, 81, 73, 0.1)' } : {}}
        >
          {isListening ? (
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

      {/* Section Header with Live Badge */}
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: textMuted }}>
          Session Feed
        </span>
        <span className="text-[10px] font-medium text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: bgCard }}>
          Live
        </span>
      </div>

      {/* Track List - Same background as main, no distinct color */}
      {(() => {
        // Mock data for demonstration
        const mockTracks: Track[] = [
          { timestamp: 'Now', title: 'Midnight City', artist: 'M83', isLive: true },
          { timestamp: '14:02', title: 'Glue', artist: 'Bicep', isLive: false },
          { timestamp: '13:58', title: 'Opus', artist: 'Eric Prydz', isLive: false },
          { timestamp: '13:54', title: 'Innerbloom', artist: 'Rufus Du Sol', isLive: false },
          { timestamp: '13:48', title: 'Strobe', artist: 'Deadmau5', isLive: false },
        ];
        const displayTracks = tracks.length > 0 ? tracks : mockTracks;
        
        return (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="py-1">
              {displayTracks.map((track, idx) => (
                <TrackRow key={idx} track={track} bgCard={bgCard} textMuted={textMuted} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Notifications Toggle - Same bg as main */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5" style={{ color: textMuted }} />
          <span className="text-xs" style={{ color: textMuted }}>Desktop Notifications</span>
        </div>
        <button
          onClick={onToggleNotifications}
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

      {/* Export Button - Same bg as main */}
      <div className="px-3 py-2">
        <button
          onClick={onExport}
          className="w-full h-10 rounded-md bg-white text-[#0D1117] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          EXPORT SESSION
        </button>
      </div>
    </>
  );
}

/* ============================================
   Scan Mix Content
   ============================================ */

interface ScanMixContentProps {
  isScanning: boolean;
  scanProgress: ScanProgress;
  mediaData: MediaData | null;
  tracks: Track[];
  onExport: () => void;
  bgMain: string;
  bgCard: string;
  textMuted: string;
}

function ScanMixContent({
  isScanning,
  scanProgress,
  mediaData,
  tracks,
  onExport,
  bgCard,
  textMuted
}: ScanMixContentProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mock data for demonstration
  const mockTracks: Track[] = [
    { timestamp: '00:00', title: 'Intro / ID', artist: 'Unknown Artist', isLive: false },
    { timestamp: '03:45', title: 'Glue', artist: 'Bicep', isLive: false },
    { timestamp: '08:12', title: 'Midnight City', artist: 'M83', isLive: false },
    { timestamp: '12:38', title: 'Opus', artist: 'Eric Prydz', isLive: false },
    { timestamp: '18:45', title: 'Innerbloom', artist: 'Rufus Du Sol', isLive: false },
    { timestamp: '22:18', title: 'Strobe', artist: 'Deadmau5', isLive: false },
  ];

  const displayTracks = tracks.length > 0 ? tracks : mockTracks;

  return (
    <>
      {/* Player Section - NO card wrapper */}
      <div className="px-3 pb-3">
        <div className="flex gap-3">
          {/* Album Art - TAB badge bottom-LEFT */}
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-teal-600 to-teal-900 flex items-center justify-center shrink-0 relative">
            <Disc className="w-6 h-6 text-white/80" />
            <div className="absolute bottom-0.5 left-0.5 bg-black text-[7px] font-bold px-1 py-0.5 rounded-sm text-white flex items-center gap-0.5">
              <span className="text-[6px]">■</span>
              SC
            </div>
          </div>

          {/* Mix Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                {isScanning && (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
                    <span className="text-[10px] font-bold text-[#00C853] uppercase tracking-wide">
                      Scanning Mix...
                    </span>
                  </>
                )}
              </div>
              <button className="p-0.5 hover:bg-white/5 rounded transition-colors">
                <ExternalLink className="w-3.5 h-3.5" style={{ color: textMuted }} />
              </button>
            </div>
            <h3 className="text-sm font-semibold truncate leading-tight">
              {mediaData?.title || 'Summer House Mix 2024'}
            </h3>

            {/* Progress Bar */}
            {isScanning && scanProgress.total > 0 && (
              <div className="mt-1.5">
                <div className="h-1 bg-[#30363D] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00C853] rounded-full"
                    style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px]" style={{ color: textMuted }}>
                    {formatTime(scanProgress.current)}
                  </span>
                  <span className="text-[9px]" style={{ color: textMuted }}>
                    {formatTime(scanProgress.total)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: textMuted }}>
          Identified Songs
        </span>
        <span className="text-[10px] font-medium text-[#00C853] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0, 200, 83, 0.1)' }}>
          {displayTracks.length} Found
        </span>
      </div>

      {/* Track List - Same bg as main */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-1">
          {displayTracks.map((track, idx) => (
            <TrackRow key={idx} track={track} bgCard={bgCard} textMuted={textMuted} />
          ))}
        </div>
      </div>

      {/* Export Button */}
      <div className="px-3 py-2">
        <button
          onClick={onExport}
          className="w-full h-10 rounded-md bg-white text-[#0D1117] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          EXPORT TRACKLIST
        </button>
      </div>
    </>
  );
}

/* ============================================
   Track Row Component
   ============================================ */

interface TrackRowProps {
  track: Track;
  bgCard: string;
  textMuted: string;
}

function TrackRow({ track, bgCard, textMuted }: TrackRowProps) {
  return (
    <div 
      className={`flex items-center gap-2.5 px-3 py-2 transition-colors ${
        track.isLive ? 'border-l-2 border-[#00C853]' : 'hover:bg-white/5'
      }`}
      style={track.isLive ? { backgroundColor: 'rgba(0, 200, 83, 0.05)' } : {}}
    >
      {/* Timestamp Badge - Dark grey rectangles */}
      <div className="shrink-0">
        {track.isLive ? (
          <span className="text-[10px] font-semibold text-[#00C853] px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 200, 83, 0.15)' }}>
            Now
          </span>
        ) : (
          <span className="text-[10px] font-mono px-2 py-1 rounded" style={{ backgroundColor: bgCard, color: textMuted }}>
            {track.timestamp}
          </span>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold truncate leading-tight text-white">
          {track.title}
        </h4>
        <p className="text-[10px] truncate" style={{ color: textMuted }}>
          {track.artist}
        </p>
      </div>

      {/* Live Indicator - Green dot on far right */}
      {track.isLive && (
        <div className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse shrink-0" />
      )}
    </div>
  );
}
