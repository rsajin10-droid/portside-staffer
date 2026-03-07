import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addUser } from '@/lib/storage';
import sklLogo from '@/assets/skl-logo.png';

const SPECIAL_CODE = 'SKLD1097';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCode, setRegCode] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load remembered credentials
  useState(() => {
    const saved = localStorage.getItem('skl_remember');
    if (saved) {
      try {
        const { username: u, password: p } = JSON.parse(saved);
        setUsername(u || '');
        setPassword(p || '');
        setRememberMe(true);
      } catch {}
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password, 'day')) {
      if (rememberMe) {
        localStorage.setItem('skl_remember', JSON.stringify({ username, password }));
      } else {
        localStorage.removeItem('skl_remember');
      }
      navigate('/dashboard');
    } else {
      toast({ title: 'Login Failed', description: 'Invalid username or password', variant: 'destructive' });
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim()) {
      return toast({ title: 'Fill all fields', variant: 'destructive' });
    }
    if (regCode !== SPECIAL_CODE) {
      return toast({ title: 'Invalid special code', description: 'Contact admin for the registration code', variant: 'destructive' });
    }
    addUser({ username: regUsername.trim(), password: regPassword.trim(), displayName: regUsername.trim() });
    toast({ title: 'User registered! Set your name in Settings > Profile.' });
    setIsRegister(false);
    setUsername(regUsername);
    setRegUsername(''); setRegPassword(''); setRegCode('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-4">
      <img src={sklLogo} alt="Sri Kamakshithai Logistics" className="w-40 md:w-48 mb-6 drop-shadow-lg" />
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <Ship className="h-8 w-8 text-secondary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">SKL</CardTitle>
          <p className="text-muted-foreground text-sm">Staff Management System</p>
        </CardHeader>
        <CardContent>
          {!isRegister ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-input" />
                <Label htmlFor="remember" className="text-sm cursor-pointer">Remember me</Label>
              </div>
              <Button type="submit" className="w-full">Login</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setIsRegister(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Register New User
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="Login username" required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Set password" required />
              </div>
              <div className="space-y-2">
                <Label>Special Code</Label>
                <Input value={regCode} onChange={e => setRegCode(e.target.value)} placeholder="Enter special code" required />
              </div>
              <Button type="submit" className="w-full">Register</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setIsRegister(false)}>Back to Login</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
