import { Library, Activity, Settings, User, ArrowRight } from 'lucide-react';
import { Button } from '@avine/ui';

interface EntryScreenProps {
  onNavigate: (screen: 'scan-mix' | 'live-listen') => void;
}

export function EntryScreen({ onNavigate }: EntryScreenProps) {
  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/10 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">A</span>
          </div>
          <span className="font-bold text-sm">Avine</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-muted rounded-full transition-colors">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center">
            <User className="w-4 h-4 text-orange-700" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 grid grid-cols-2 gap-3">
        {/* Scan Mix Card */}
        <button
          onClick={() => onNavigate('scan-mix')}
          className="relative group flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/50 transition-all text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Library className="w-6 h-6 text-foreground" />
          </div>
          <h3 className="font-semibold text-sm mb-1">Scan Mix</h3>
          <p className="text-[10px] text-muted-foreground leading-tight px-1">
            Identify tracklists from YouTube or SoundCloud mixes
          </p>
          
          {/* Subtle input hint at bottom, though the interaction is clicking the card */}
          <div className="mt-4 w-full h-8 bg-background/50 rounded flex items-center px-2 border border-border/30 opacity-70 group-hover:opacity-100 transition-opacity">
             <span className="text-[10px] text-muted-foreground">Paste URL here..</span>
             <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto" />
          </div>
        </button>

        {/* Live Listen Card */}
        <button
          onClick={() => onNavigate('live-listen')}
          className="group flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/50 transition-all text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6 text-foreground" />
          </div>
          <h3 className="font-semibold text-sm mb-1">Live Listen</h3>
          <p className="text-[10px] text-muted-foreground leading-tight px-1">
            Identify songs playing in your active browser tab in real-time
          </p>
          
          <div className="mt-4">
             <Button size="sm" className="h-8 text-xs font-medium px-4 bg-green-500 hover:bg-green-600 text-white border-0">
               Start Listening
             </Button>
          </div>
        </button>
      </div>

      {/* Footer / Status Area if needed */}
      <div className="px-4 py-2 border-t border-border/10">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
           <span>v0.0.1</span>
           <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
             Ready
           </div>
        </div>
      </div>
    </div>
  );
}
