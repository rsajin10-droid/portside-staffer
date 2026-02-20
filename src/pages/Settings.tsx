import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserPassword, getUsers } from '@/lib/storage';
import { Download, Upload } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  profileImage: string;
}

const getProfile = (userId: string): UserProfile => {
  try { return JSON.parse(localStorage.getItem(`skl_profile_${userId}`) || '{}'); } catch { return {} as UserProfile; }
};
const saveProfile = (userId: string, p: UserProfile) => localStorage.setItem(`skl_profile_${userId}`, JSON.stringify(p));

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [email, setEmail] = useState('');

  // Profile
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', phone: '', address: '', dob: '', profileImage: '' });

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    if (user) {
      const p = getProfile(user.id);
      setProfile({ name: p.name || user.displayName, email: p.email || '', phone: p.phone || '', address: p.address || '', dob: p.dob || '', profileImage: p.profileImage || '' });
    }
  }, [user]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('skl_theme', next ? 'dark' : 'light');
  };

  const handleChangePassword = () => {
    if (!user) return;
    const users = getUsers();
    const u = users.find(x => x.id === user.id);
    if (!u || u.password !== oldPw) return toast({ title: 'Current password incorrect', variant: 'destructive' });
    if (newPw.length < 4) return toast({ title: 'Password too short', variant: 'destructive' });
    if (newPw !== confirmPw) return toast({ title: 'Passwords do not match', variant: 'destructive' });
    updateUserPassword(user.id, newPw);
    setOldPw(''); setNewPw(''); setConfirmPw('');
    toast({ title: 'Password changed' });
  };

  const handleSaveEmail = () => {
    localStorage.setItem('skl_backup_email', email);
    toast({ title: 'Backup email saved' });
  };

  const handleSaveProfile = () => {
    if (!user) return;
    saveProfile(user.id, profile);
    toast({ title: 'Profile saved' });
  };

  const handleProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile(p => ({ ...p, profileImage: reader.result as string }));
    reader.readAsDataURL(file);
  };

  // Data Recovery
  const exportData = () => {
    const keys = ['skl_users', 'skl_staff', 'skl_attendance', 'skl_jobs', 'skl_backup_email', 'skl_theme'];
    const data: Record<string, string | null> = {};
    keys.forEach(k => { data[k] = localStorage.getItem(k); });
    // Also export profiles
    Object.keys(localStorage).filter(k => k.startsWith('skl_profile_')).forEach(k => { data[k] = localStorage.getItem(k); });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `skl_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'Data exported successfully' });
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        Object.entries(data).forEach(([k, v]) => {
          if (v !== null && typeof v === 'string') localStorage.setItem(k, v);
        });
        toast({ title: 'Data imported. Refresh to apply.' });
      } catch {
        toast({ title: 'Invalid backup file', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold">Settings</h2>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {profile.profileImage ? (
                    <img src={profile.profileImage} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-primary" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                      {(profile.name || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <Label className="cursor-pointer text-primary hover:underline">
                      Change Photo
                      <input type="file" accept="image/*" className="hidden" onChange={handleProfileImage} />
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Name</Label><Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={profile.dob} onChange={e => setProfile(p => ({ ...p, dob: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Address</Label><Input value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} /></div>
                <Button onClick={handleSaveProfile}>Save Profile</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Current Password</Label><Input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} /></div>
                <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} /></div>
                <div className="space-y-2"><Label>Confirm New Password</Label><Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} /></div>
                <Button onClick={handleChangePassword}>Update Password</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme">
            <Card>
              <CardHeader><CardTitle>Theme</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <Label>Dark Mode</Label>
                <Switch checked={isDark} onCheckedChange={toggleTheme} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Data Backup</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email for backup</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                  </div>
                  <p className="text-xs text-muted-foreground">Auto backup daily at 12 AM (requires backend setup)</p>
                  <Button onClick={handleSaveEmail} variant="outline">Save Email</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Data Recovery</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Export all data as a backup file or import from a previous backup when using a new device.</p>
                  <div className="flex gap-3">
                    <Button onClick={exportData} variant="outline"><Download className="h-4 w-4 mr-2" />Export Data</Button>
                    <Label className="cursor-pointer">
                      <Button variant="outline" asChild><span><Upload className="h-4 w-4 mr-2" />Import Data</span></Button>
                      <input type="file" accept=".json" className="hidden" onChange={importData} />
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Created by <span className="font-semibold text-foreground">SAJIN RAJ</span></p>
            <a href="https://wa.me/919746971097" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-success hover:underline">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              9746971097
            </a>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
