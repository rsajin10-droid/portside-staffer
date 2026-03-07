import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUsers, AppUser } from '@/lib/storage';

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

  // Check for existing session in localStorage on mount
  useEffect(() => {
    const checkSession = () => {
      const savedUser = localStorage.getItem('skl_active_user');
      const savedShift = localStorage.getItem('skl_active_shift');
      
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          // Re-verify if user still exists and is not deactivated
          const allUsers = getUsers();
          const validUser = allUsers.find(u => u.id === userData.id && !u.deactivated);
          
          if (validUser) {
            setUser(validUser);
            if (savedShift) setShiftState(savedShift as 'day' | 'night');
          } else {
            localStorage.removeItem('skl_active_user');
          }
        } catch (e) {
          console.error("Session restoration failed", e);
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const setShift = (s: 'day' | 'night') => {
    setShiftState(s);
    localStorage.setItem('skl_active_shift', s);
  };

  const login = async (username: string, password: string, sh: 'day' | 'night'): Promise<boolean> => {
    // Artificial delay to mimic server response
    await new Promise(resolve => setTimeout(resolve, 500));

    const allUsers = getUsers();
    const foundUser = allUsers.find(u => 
      u.username.toLowerCase() === username.trim().toLowerCase() && 
      u.password === password
    );

    if (!foundUser || foundUser.deactivated) {
      return false;
    }

    // Set user state and persistence
    setUser(foundUser);
    setShift(sh);
    localStorage.setItem('skl_active_user', JSON.stringify(foundUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('skl_active_user');
    localStorage.removeItem('skl_active_shift');
  };

  return (
    <AuthContext.Provider value={{ user, shift, setShift, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
