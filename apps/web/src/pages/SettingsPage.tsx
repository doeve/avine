import { useState } from 'react';
import { SpotifyConnect } from '../components/SpotifyConnect';
import { useAuthStore } from '../store/auth.store';
import { 
  User, 
  Mail, 
  Music2, 
  Bell, 
  Download,
  Shield,
  Save,
  Loader2
} from 'lucide-react';
import { Button, Input, Label } from '@avine/ui';

export function SettingsPage() {
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState('json');

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <section className="p-6 rounded-xl border border-border bg-card/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Profile</h2>
            <p className="text-sm text-muted-foreground">Your personal information</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2">
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="flex-1"
              />
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
        </div>
      </section>

      {/* Connections Section */}
      <section className="p-6 rounded-xl border border-border bg-card/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#1DB954]/10 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-[#1DB954]" />
          </div>
          <div>
            <h2 className="font-semibold">Connected Accounts</h2>
            <p className="text-sm text-muted-foreground">Manage external integrations</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Music2 className="w-5 h-5 text-[#1DB954]" />
            <div>
              <div className="font-medium text-sm">Spotify</div>
              <div className="text-xs text-muted-foreground">Create playlists from identified tracks</div>
            </div>
          </div>
          <SpotifyConnect />
        </div>
      </section>

      {/* Preferences Section */}
      <section className="p-6 rounded-xl border border-border bg-card/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Preferences</h2>
            <p className="text-sm text-muted-foreground">Customize your experience</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Notifications */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Notifications</div>
                <div className="text-xs text-muted-foreground">Get notified when analysis completes</div>
              </div>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                notificationsEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Default Export Format */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Default Export Format</div>
                <div className="text-xs text-muted-foreground">Format used when exporting tracks</div>
              </div>
            </div>
            <select
              value={defaultExportFormat}
              onChange={(e) => setDefaultExportFormat(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="txt">Plain Text</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
