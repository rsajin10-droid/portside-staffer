import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useCallback } from 'react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, shift } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle phone back button: sub-page → dashboard, dashboard → exit
  const handlePopState = useCallback(() => {
    if (location.pathname === '/dashboard') {
      // Let the browser exit
    } else {
      // Prevent default back and go to dashboard
      window.history.pushState(null, '', window.location.href);
      navigate('/dashboard');
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    // Push an extra history entry so back button fires popstate
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 gap-3 bg-card">
            <SidebarTrigger />
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
