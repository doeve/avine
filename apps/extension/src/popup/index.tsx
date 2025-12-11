import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { EntryScreen } from './components/EntryScreen';
import { ScanMixScreen } from './components/ScanMixScreen';
import { LiveListenScreen } from './components/LiveListenScreen';
import '../index.css';

type Screen = 'entry' | 'scan-mix' | 'live-listen';

function Popup() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('entry');

  // Load saved state (optional, if we want to remember last screen)
  useEffect(() => {
     // For now, start at entry
  }, []);

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  return (
    <div className="w-[400px] h-[500px] overflow-hidden bg-background text-foreground font-sans antialiased text-base selection:bg-primary/20">
      {currentScreen === 'entry' && (
        <EntryScreen onNavigate={navigate} />
      )}
      
      {currentScreen === 'scan-mix' && (
        <ScanMixScreen onBack={() => navigate('entry')} />
      )}
      
      {currentScreen === 'live-listen' && (
        <LiveListenScreen onBack={() => navigate('entry')} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
