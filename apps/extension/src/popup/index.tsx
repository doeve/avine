import React from 'react';
import ReactDOM from 'react-dom/client';
import { MainScreen } from './components/MainScreen';
import '../index.css';

function Popup() {
  return (
    <div className="w-[800px] h-[600px] overflow-hidden bg-background text-foreground font-sans antialiased">
      <MainScreen />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
