import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
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
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load remembered credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem('skl_remember');
    if (saved) {
      try {
        const { username: u, password: p } = JSON.parse(saved);
        setUsername(u || '');
        setPassword(p || '');
        setRememberMe(true);
      } catch (e) {
        console.error("Error loading remembered credentials", e);
      }
    }
  }, []);

  // ─── LOGIN LOGIC (Supabase Integrated) ───
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    try {
      // Calling the async login function from AuthContext
      const success = await login(username, password, 'day');
      
      if (success) {
        if (rememberMe) {
          localStorage.setItem('skl_remember', JSON.stringify({ username, password }));
        } else {
          localStorage.removeItem('skl_remember');
        }
        toast({ title: 'Welcome back!' });
        navigate('/dashboard');
      } else {
        toast({ 
          title: 'Login Failed', 
          description: 'Invalid username/password or account not approved.', 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ─── REGISTER LOGIC (Supabase Integrated) ───
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regUsername.trim() || !regPassword.trim()) {
      return toast({ title: 'Please fill all fields', variant: 'destructive' });
    }
    
    if (regCode !== SPECIAL_CODE) {
      return toast({ 
        title: 'Invalid Special Code', 
        description: 'Contact admin to get the valid registration code.', 
        variant: 'destructive' 
      });
    }

    setLoading(true);
    // Creating a virtual email for Supabase authentication
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

      if (data.user) {
        toast({ 
          title: 'Registration Successful!', 
          description: 'You can now log in with your credentials.' 
        });
        setIsRegister(false);
        setUsername(regUsername);
        setPassword(regPassword);
      }
    } catch (err: any) {
      console.error('Registration Error:', err.message);
      toast({ title: 'Registration Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-4">
      <img src={sklLogo} alt="Sri Kamakshithai Logistics" className="w-40 md:w-48 mb-6 drop-shadow-lg" />
      
      <Card className="w-full max-w-md animate-fade-in shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center shadow-inner">
            <Ship className="h-8 w-8 text-secondary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">SKL System</CardTitle>
          <p className="text-muted-foreground text-sm font-medium"> Sri Kamakshithai Logistics </p>
        </CardHeader>
        
        <CardContent>
          {!isRegister ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  placeholder="Enter your username"
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="remember" 
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)} 
                  className="rounded border-gray-300 text-primary focus:ring-primary" 
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer select-none">Remember me</Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login'}
              </Button>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">New here?</span></div>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={() => setIsRegister(true)} disabled={loading}>
                <UserPlus className="h-4 w-4 mr-2" /> Create Supervisor Account
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Set Username</Label>
                <Input 
                  value={regUsername} 
                  onChange={e => setRegUsername(e.target.value)} 
                  placeholder="Username for login" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Set Password</Label>
                <Input 
                  type="password" 
                  value={regPassword} 
                  onChange={e => setRegPassword(e.target.value)} 
                  placeholder="Choose a strong password" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold">Special Registration Code</Label>
                <Input 
                  value={regCode} 
                  onChange={e => setRegCode(e.target.value)} 
                  placeholder="Enter the code provided by Admin" 
                  required 
                  className="border-primary/50"
                />
              </div>
              <Button type="submit" className="w-full bg-primary" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Register Now'}
              </Button>
              <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setIsRegister(false)} disabled={loading}>
                Already have an account? Back to Login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <p className="mt-8 text-xs text-white/60">© 2026 Sri Kamakshithai Logistics. All Rights Reserved.</p>
    </div>
  );
}
