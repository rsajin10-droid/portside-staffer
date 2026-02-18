import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Ship } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shift, setShift] = useState<'day' | 'night'>('day');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password, shift)) {
      navigate('/dashboard');
    } else {
      toast({ title: 'Login Failed', description: 'Invalid username or password', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <Ship className="h-8 w-8 text-secondary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">SKL</CardTitle>
          <p className="text-muted-foreground text-sm">Staff Management System</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Shift</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={shift === 'day' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setShift('day')}
                >
                  <Sun className="h-4 w-4 mr-2" /> Day
                </Button>
                <Button
                  type="button"
                  variant={shift === 'night' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setShift('night')}
                >
                  <Moon className="h-4 w-4 mr-2" /> Night
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Login</Button>
            <p className="text-xs text-center text-muted-foreground">Default: admin / admin123</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
