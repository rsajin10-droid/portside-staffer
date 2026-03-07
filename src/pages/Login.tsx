import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase'; // Import supabase client
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

  // Handle Login
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
      toast({ title: 'Login Failed', description: 'Invalid credentials', variant: 'destructive' });
    }
  };

  // ─── UPDATED REGISTER LOGIC ───
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regUsername.trim() || !regPassword.trim()) {
      return toast({ title: 'Fill all fields', variant: 'destructive' });
    }
    
    if (regCode !== SPECIAL_CODE) {
      return toast({ title: 'Invalid special code', variant: 'destructive' });
    }

    // Creating email from username for Supabase Auth
    const email = `${regUsername.trim().toLowerCase()}@skl.com`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: regPassword,
        options: {
          data: {
            username: regUsername.trim(),
            display_name: regUsername.trim(),
            special_code: regCode
          }
        }
      });

      if (error) throw error;

      toast({ title: 'Registration Successful!', description: 'You can now log in.' });
      setIsRegister(false);
      setUsername(regUsername);
    } catch (err: any) {
      console.error('Registration Error:', err.message);
      toast({ title: 'Registration Failed', description: err.message, variant: 'destructive' });
    }
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
