import { Link } from 'react-router-dom';
import { Music, Upload, Share2, Sparkles, ArrowRight, Disc3, Zap, FileText } from 'lucide-react';
import { Button } from '@avine/ui';

// Wave icon matching extension branding
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

const features = [
  {
    icon: Upload,
    title: 'Upload & Analyze',
    description: 'Drop any audio file or paste a URL. We identify every track in seconds.',
  },
  {
    icon: Disc3,
    title: 'DJ Mix Recognition',
    description: 'Perfect for identifying tracks in DJ sets, podcasts, and radio shows.',
  },
  {
    icon: Share2,
    title: 'Export Anywhere',
    description: 'Export to Spotify playlists, YouTube chapters, CUE sheets, and more.',
  },
  {
    icon: FileText,
    title: 'Custom Templates',
    description: 'Create your own export formats with our powerful template editor.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WaveIcon className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">Avine</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="gap-1.5">
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Audio Intelligence Platform
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Identify Every Track
            <br />
            <span className="text-primary">In Any Mix</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Upload audio files, paste URLs, or use our browser extension to instantly 
            identify songs. Export to Spotify, create playlists, and never lose a track again.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="gap-2 px-8">
                Start For Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Visual Element */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-border bg-card/50 p-8 overflow-hidden">
            {/* Gradient glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30" />
            
            <div className="relative flex items-center justify-center gap-8">
              {/* Mock track cards */}
              {[
                { title: 'Strobe', artist: 'deadmau5', time: '0:00' },
                { title: 'One More Time', artist: 'Daft Punk', time: '7:42' },
                { title: 'Levels', artist: 'Avicii', time: '15:28' },
              ].map((track, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-3 p-4 rounded-xl border bg-card ${
                    idx === 1 ? 'scale-110 border-primary shadow-lg shadow-primary/20' : 'opacity-60'
                  } transition-all`}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                    <Music className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{track.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
                    <div className="text-[10px] text-primary font-mono mt-1">{track.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to identify, organize, and share your music discoveries.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="group p-6 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats/Trust Section */}
      <section className="py-20 px-6 border-t border-border/50 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10M+</div>
              <div className="text-sm text-muted-foreground">Tracks Identified</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">99%</div>
              <div className="text-sm text-muted-foreground">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">&lt;5s</div>
              <div className="text-sm text-muted-foreground">Average Response</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of DJs, producers, and music lovers who use Avine every day.
          </p>
          <Link to="/register">
            <Button size="lg" className="gap-2 px-10">
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <WaveIcon className="w-4 h-4 text-primary" />
            <span>Avine</span>
          </div>
          <div>© 2024 Avine. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
