import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUsers, addUser } from '@/lib/storage';
import sklLogo from '@/assets/skl-logo.png';

const SPECIAL_CODE = 'SKLD1097';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regCode, setRegCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load saved credentials if 'Remember Me' was checked previously
  useEffect(() => {
    const saved = localStorage.getItem('skl_remember');
    if (saved) {
      try {
        const { username: u, password: p } = JSON.parse(saved);
        setUsername(u || '');
        setPassword(p || '');
        setRememberMe(true);
      } catch (e) {
        console.error("Error loading saved credentials", e);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    try {
      // Calling the login function from AuthContext which now uses local storage
      const success = await login(username.trim(), password, 'day');
      
      if (success) {
        if (rememberMe) {
          localStorage.setItem('skl_remember', JSON.stringify({ username, password }));
        } else {
          localStorage.removeItem('skl_remember');
        }
        toast({ title: 'Success', description: 'Logged in successfully' });
        navigate('/dashboard');
      } else {
        toast({ 
          title: 'Login Failed', 
          description: 'Invalid username or password.', 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regUsername.trim() || !regPassword.trim() || !regCode.trim() || !regDisplayName.trim()) {
      return toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
    }
    
    if (regCode !== SPECIAL_CODE) {
      return toast({ 
        title: 'Invalid Code', 
        description: 'The special registration code is incorrect.', 
        variant: 'destructive' 
      });
    }

    setLoading(true);

    try {
      // Check if username already exists in local storage
      const users = getUsers();
      if (users.some(u => u.username === regUsername.trim())) {
        throw new Error('Username already exists');
      }

      // Add new supervisor to local storage
      addUser({
        username: regUsername.trim(),
        password: regPassword,
        displayName: regDisplayName.trim(),
        role: 'supervisor'
      });

      toast({ 
        title: 'Registered!', 
        description: 'Account created. You can now login.' 
      });
      setIsRegister(false);
      setUsername(regUsername);
      setPassword(regPassword);
      
    } catch (err: any) {
      toast({ title: 'Registration Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8 text-center">
        <img src={sklLogo} alt="SKL Logo" className="w-32 md:w-40 mx-auto drop-shadow-md mb-2" />
        <h1 className="text-xl font-bold text-primary">Sri Kamakshithai Logistics</h1>
      </div>

      <Card className="w-full max-w-md border-t-4 border-primary shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isRegister ? 'Create Account' : 'Staff Login'}
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? 'Register as a new supervisor' : 'Enter your credentials to access the system'}
          </p>
        </CardHeader>
        <CardContent>
          {!isRegister ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder="Enter username"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required 
                />
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="remember" 
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Remember me</Label>
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Login
              </Button>
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsRegister(true)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Don't have an account? Register here
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  value={regDisplayName} 
                  onChange={e => setRegDisplayName(e.target.value)} 
                  placeholder="Your Name"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input 
                  value={regUsername} 
                  onChange={e => setRegUsername(e.target.value)} 
                  placeholder="Choose username"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  type="password" 
                  value={regPassword} 
                  onChange={e => setRegPassword(e.target.value)} 
                  placeholder="Min. 6 characters"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-blue-600 font-bold">Special Code</Label>
                <Input 
                  value={regCode} 
                  onChange={e => setRegCode(e.target.value)} 
                  placeholder="Registration code"
                  className="border-blue-300 focus:border-blue-500"
                  required 
                />
              </div>
              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Register Supervisor
              </Button>
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsRegister(false)}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
