import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUsers, type AppUser } from '@/lib/storage';

interface AuthState {
  user: AppUser | null;
  shift: 'day' | 'night';
  setShift: (s: 'day' | 'night') => void;
  login: (username: string, password: string, shift: 'day' | 'night') => boolean;
  logout: () => void;
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

  useEffect(() => {
    const saved = localStorage.getItem('skl_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setUser(s.user);
        setShiftState(s.shift || 'day');
      } catch {}
    }
  }, []);

  const setShift = (s: 'day' | 'night') => {
    setShiftState(s);
    const saved = localStorage.getItem('skl_session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        session.shift = s;
        localStorage.setItem('skl_session', JSON.stringify(session));
      } catch {}
    }
  };

  const login = (username: string, password: string, sh: 'day' | 'night') => {
    const users = getUsers();
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      if (found.deactivated) return false;
      // Use profile displayName if available
      const profile = localStorage.getItem(`skl_profile_${found.id}`);
      let displayName = found.displayName;
      if (profile) {
        try {
          const p = JSON.parse(profile);
          if (p.name) displayName = p.name;
        } catch {}
      }
      const userWithName = { ...found, displayName };
      setUser(userWithName);
      setShiftState(sh);
      localStorage.setItem('skl_session', JSON.stringify({ user: userWithName, shift: sh }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('skl_session');
  };

  return <AuthContext.Provider value={{ user, shift, setShift, login, logout }}>{children}</AuthContext.Provider>;
};
