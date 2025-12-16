import { useState, useEffect } from 'react';
import { Settings, User, Music, ExternalLink, Play } from 'lucide-react';
import { Button } from '@avine/ui';

// Color Palette Constants for easy tweaking
const COLORS = {
  bg: 'bg-[#0a0f0d]', // Deep dark green/black
  card: 'bg-[#121c18]', // Slightly lighter panel
  primary: 'text-[#4ade80]', // Neon green text
  primaryBg: 'bg-[#4ade80]', // Neon green background
  muted: 'text-[#6d7d75]', // Muted grey-green
  border: 'border-[#1f2e28]', // Dark border
};

interface Track {
  startTime: string; // "00:00"
  endTime: string;   // "04:20" or "..." if live
  title: string;
  artist: string;
  isLive?: boolean;
}

export function MainScreen() {
  const [isListening, setIsListening] = useState(false);
  const [pageData, setPageData] = useState<any>(null); // From Scan
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  
  // Combine historical tracks (from scan or previous session) with live updates
  const [trackList, setTrackList] = useState<Track[]>([]);

  // Load initial state
  useEffect(() => {
    chrome.storage.local.get(['isListening', 'trackHistory'], (data) => {
       if (data.isListening) setIsListening(true);
       if (data.trackHistory && Array.isArray(data.trackHistory)) {
         setTrackList(data.trackHistory);
         // Restore current track if the last one was active/recent?
         // For now just load the list.
         const last = data.trackHistory[data.trackHistory.length - 1];
         if (last && last.isLive) setCurrentTrack(last);
       }
    });

    // Scan Page for Context (Mix Title, Platform)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'SCAN_MEDIA' }, (response) => {
           if (response && response.found) {
             setPageData({
               title: response.title,
               platform: response.platform || 'WEB',
               duration: response.duration
             });
           } else {
             // Fallback if no media found on page
             setPageData({
               title: 'Unknown Source',
               platform: 'SYSTEM',
               duration: 0
             });
           }
        });
      }
    });

    // Listen for Live Recognition
    const listener = (message: any) => {
      if (message.type === 'RECOGNITION_RESULT') {
        handleNewDetection(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Persist trackList whenever it changes
  useEffect(() => {
    if (trackList.length > 0) {
      chrome.storage.local.set({ trackHistory: trackList });
    }
  }, [trackList]);

  const handleNewDetection = (data: any) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create new track
    const newTrack: Track = {
      startTime: timeStr,
      endTime: '...',
      title: data.title,
      artist: data.artist,
      isLive: true
    };

    setTrackList(prev => {
      // 1. De-duplicate: if same as last track, ignore or update timestamp?
      // Usually better to ignore if it's the same song consecutively detected
      const last = prev[prev.length - 1];
      if (last && last.title === newTrack.title && last.artist === newTrack.artist) {
         return prev; 
      }

      setCurrentTrack(newTrack);

      // 2. Close previous track
      const updated = [...prev];
      if (updated.length > 0) {
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
           ...updated[lastIdx],
           endTime: timeStr,
           isLive: false
        };
      }
      return [...updated, newTrack];
    });
  };

  const toggleListening = () => {
    const newState = !isListening;
    setIsListening(newState);
    chrome.storage.local.set({ isListening: newState });
    
    if (newState) {
      chrome.runtime.sendMessage({ type: 'START_CAPTURE' });
    } else {
      chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    return `${mins}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-[800px] h-[500px] flex flex-col font-sans ${COLORS.bg} text-white overflow-hidden`}>
      {/* Header */}
      <header className={`h-16 px-6 flex items-center justify-between border-b ${COLORS.border} shrink-0`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/50">
            <div className="w-4 h-4 bg-[#0a0f0d] rotate-45 transform" /> 
            {/* Abstract logo placeholder */}
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Avine</span>
        </div>

        {/* Center Toggle? Or Right Side Controls */}
        <div className="flex items-center gap-2 bg-[#141f1a] p-1 rounded-full border border-[#1f2e28]">
           <button 
             onClick={toggleListening}
             className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${isListening ? 'bg-emerald-500 text-[#0a0f0d] shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white'}`}
           >
             {isListening ? (
               <>
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                 </span>
                 LISTENING
               </>
             ) : (
               <>
                 <Play className="w-3 h-3 fill-current" />
                 START
               </>
             )}
           </button>
        </div>

        <div className="flex items-center gap-4">
          <Settings className="w-5 h-5 text-[#6d7d75] hover:text-white cursor-pointer transition-colors" />
          <div className="w-8 h-8 rounded-full bg-[#fcd34d] flex items-center justify-center text-[#78350f] shadow-inner">
             <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-[300px_1fr]">
        
        {/* Left Column: Now Playing / Media Context */}
        <div className={`p-6 flex flex-col gap-6 border-r ${COLORS.border} `}>
            {/* Visualizer / Album Art Card */}
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsie-600 relative overflow-hidden group shadow-2xl">
               <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-pink-500 opacity-90 transition-opacity"></div>
               
               {/* Animated Visualizer Bars (CSS mainly) */}
               <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                  {[1,2,3].map(i => (
                    <div key={i} className={`w-3 bg-white/90 rounded-full animate-bounce ${isListening ? '' : 'paused'}`} style={{ height: isListening ? '40%' : '20%', animationDuration: `${0.5 + i * 0.2}s` }}></div>
                  ))}
               </div>

               {/* Live Badge */}
               {isListening && (
                 <div className="absolute top-4 left-4 px-2 py-1 bg-red-600 rounded text-[10px] font-bold text-white flex items-center gap-1.5 shadow-lg">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    LIVE
                 </div>
               )}
            </div>

            {/* Track Info */}
            <div className="space-y-4">
               {/* Source Badge */}
               <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider w-fit">
                  <Play className="w-2 h-2 fill-current" />
                  {pageData?.platform || 'YOUTUBE'}
               </div>

               <div>
                  <h2 className="text-xl font-bold leading-tight mb-2 text-white">
                    {currentTrack ? currentTrack.title : (pageData?.title || 'Waiting for audio...')}
                  </h2>
                  <div className="text-sm text-[#6d7d75] space-y-1">
                    <p>{pageData ? `${formatDuration(pageData.duration)} duration` : ''}</p>
                    <p>{trackList.length} tracks recognized</p>
                  </div>
               </div>
            </div>

            {/* Spacer to push button to bottom if needed */}
            <div className="flex-1" />

            {/* Export Button */}
            <Button 
               // Default UI button might need style override
               className={`w-full h-12 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-[#064e3b] font-bold text-sm tracking-wide shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2`}
               onClick={() => {
                 // Export logic
               }}
            >
               <ExternalLink className="w-4 h-4" />
               Export Tracklist
            </Button>
        </div>

        {/* Right Column: Tracklist */}
        <div className="flex flex-col bg-[#0d1411]">
           {/* Table Header */}
           <div className="grid grid-cols-[100px_4fr_3fr] px-6 py-4 border-b border-[#1f2e28] text-[10px] font-bold text-[#4ade80] uppercase tracking-widest shrink-0">
              <div className="text-[#6d7d75]">Time</div>
              <div>Track Name</div>
              <div className="text-right">Artist</div>
           </div>

           {/* Scrollable List */}
           <div className="flex-1 overflow-y-auto custom-scrollbar">
              {trackList.map((track, idx) => {
                const isNowPlaying = (idx === trackList.length - 1) && track.isLive;
                return (
                  <div 
                    key={idx} 
                    className={`grid grid-cols-[100px_4fr_3fr] px-6 py-4 border-b border-[#1f2e28]/50 items-center hover:bg-[#14201a] transition-colors group ${isNowPlaying ? 'bg-[#14201a]/50' : ''}`}
                  >
                     <div className="font-mono text-xs text-emerald-500 group-hover:text-emerald-400 transition-colors">
                        {track.startTime} <span className="text-[#6d7d75] mx-1">→</span> {track.endTime}
                     </div>
                     <div className={`text-sm font-medium truncate pr-4 ${isNowPlaying ? 'text-white' : 'text-gray-300'}`}>
                        {track.title}
                     </div>
                     <div className="text-xs text-[#6d7d75] text-right truncate pl-4">
                        {track.artist}
                     </div>
                  </div>
                );
              })}
              
              {/* Empty State */}
              {trackList.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-[#6d7d75] gap-2 p-8 text-center">
                   <Music className="w-8 h-8 opacity-20" />
                   <p className="text-xs">No tracks identified yet.</p>
                   <p className="text-[10px opacity-50">Start playback to recognize songs.</p>
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}
