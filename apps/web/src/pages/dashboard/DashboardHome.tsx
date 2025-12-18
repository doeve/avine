import { Link } from 'react-router-dom';
import { 
  Upload, 
  History, 
  Music, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Button } from '@avine/ui';

const quickActions = [
  { 
    icon: Upload, 
    title: 'Upload Audio', 
    description: 'Drop a file or paste a URL',
    path: '/dashboard/upload',
    color: 'text-blue-400'
  },
  { 
    icon: History, 
    title: 'View History', 
    description: 'Browse past sessions',
    path: '/dashboard/history',
    color: 'text-purple-400'
  },
  { 
    icon: Music, 
    title: 'Track Library', 
    description: 'All identified tracks',
    path: '/dashboard/library',
    color: 'text-green-400'
  },
  { 
    icon: FileText, 
    title: 'Templates', 
    description: 'Custom export formats',
    path: '/dashboard/templates',
    color: 'text-orange-400'
  },
];

const mockStats = [
  { label: 'Total Sessions', value: '12', icon: Clock },
  { label: 'Tracks Found', value: '156', icon: Music },
  { label: 'Success Rate', value: '98%', icon: CheckCircle },
];

export function DashboardHome() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-muted-foreground">Here's what's happening with your audio analysis.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {mockStats.map((stat) => (
          <div 
            key={stat.label}
            className="p-5 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-5 h-5 text-primary" />
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link 
              key={action.path}
              to={action.path}
              className="group p-5 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors`}>
                <action.icon className={`w-5 h-5 ${action.color} group-hover:text-primary transition-colors`} />
              </div>
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                {action.title}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Link to="/dashboard/history">
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
          <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No recent activity</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Upload an audio file to get started</p>
          <Link to="/dashboard/upload" className="mt-4 inline-block">
            <Button size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
