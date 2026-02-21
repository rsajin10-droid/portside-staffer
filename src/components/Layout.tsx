import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, shift } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.pathname === '/dashboard') {
      // On dashboard, try to exit (close tab/go back in browser history)
      if (window.history.length > 1) {
        window.history.back();
      }
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 gap-3 bg-card">
            <SidebarTrigger />
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            {user && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{user.displayName}</span>
                <span className="mx-2">|</span>
                <span className="capitalize">{shift} Shift</span>
                <span className="mx-2">|</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            )}
          </header>
          <div className="flex-1 p-4 md:p-6 overflow-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
