import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StaffManagement from "./pages/StaffManagement";
import Attendance from "./pages/Attendance";
import JobAllotment from "./pages/JobAllotment";
import Reports from "./pages/Reports";
import DriverLogbook from "./pages/DriverLogbook";
import DigitalDiary from "./pages/DigitalDiary";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AutoLogin() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem('skl_theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    // Apply color theme
    const colorTheme = localStorage.getItem('skl_color_theme');
    if (colorTheme && colorTheme !== 'default') {
      document.documentElement.classList.add(`theme-${colorTheme}`);
    }
  }, []);
  return null;
}

// Register service worker only in production to avoid stale-cache issues in preview/dev
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister())).catch(() => {});
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <ThemeInit />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AutoLogin />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/job-allotment" element={<ProtectedRoute><JobAllotment /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/driver-logbook" element={<ProtectedRoute><DriverLogbook /></ProtectedRoute>} />
            <Route path="/digital-diary" element={<ProtectedRoute><DigitalDiary /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
