import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Import supabase client

interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role?: string;
  deactivated?: boolean;
}

interface AuthState {
  user: AppUser | null;
  shift: 'day' | 'night';
  setShift: (s: 'day' | 'night') => void;
  login: (username: string, password: string, shift: 'day' | 'night') => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [shift, setShiftState] = useState<'day' | 'night'>('day');
  const [loading, setLoading] = useState(true);

  // 1. Check for active Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Fetch additional user info from app_users table
        const { data: userData } = await supabase
          .from('app_users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userData && !userData.deactivated) {
          setUser({
            id: session.user.id,
            username: userData.username,
            displayName: userData.display_name,
            role: userData.role
          });
        }
      }
      setLoading(false);
    };
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkSession();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setShift = (s: 'day' | 'night') => {
    setShiftState(s);
  };

  // 2. Updated Login to use Supabase Auth
  const login = async (username: string, password: string, sh: 'day' | 'night') => {
    const email = `${username.trim().toLowerCase()}@skl.com`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) return false;

    // Check if user is deactivated in our table
    const { data: userData } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!userData || userData.deactivated) {
      await supabase.auth.signOut();
      return false;
    }

    setUser({
      id: data.user.id,
      username: userData.username,
      displayName: userData.display_name,
      role: userData.role
    });
    setShiftState(sh);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, shift, setShift, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
