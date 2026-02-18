import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUsers, type AppUser } from '@/lib/storage';

interface AuthState {
  user: AppUser | null;
  shift: 'day' | 'night';
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
  const [shift, setShift] = useState<'day' | 'night'>('day');

  useEffect(() => {
    const saved = localStorage.getItem('skl_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setUser(s.user);
        setShift(s.shift);
      } catch {}
    }
  }, []);

  const login = (username: string, password: string, sh: 'day' | 'night') => {
    const users = getUsers();
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      setUser(found);
      setShift(sh);
      localStorage.setItem('skl_session', JSON.stringify({ user: found, shift: sh }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('skl_session');
  };

  return <AuthContext.Provider value={{ user, shift, login, logout }}>{children}</AuthContext.Provider>;
};
