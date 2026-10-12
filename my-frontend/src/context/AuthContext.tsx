'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, setAuthToken } from '@/lib/api';
import { setAccountOwnerId } from '@/services/accountsApi';
import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  setTokenFromOAuth: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (token) {
        setAuthToken(token);
        try {
          const res = await authApi.getMe();
          setUser(res.data);
          setAccountOwnerId(String(res.data.id));
        } catch {
          setAuthToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const res = await authApi.login(credentials);
    const { accessToken } = res.data;
    setAuthToken(accessToken);

    const meRes = await authApi.getMe();
    setUser(meRes.data);
    setAccountOwnerId(String(meRes.data.id));
  };

  const register = async (credentials: RegisterCredentials) => {
    await authApi.register(credentials);
    await login({ email: credentials.email, password: credentials.password });
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    router.push('/');
  };

  const setTokenFromOAuth = async (accessToken: string) => {
    setAuthToken(accessToken);
    const meRes = await authApi.getMe();
    setUser(meRes.data);
    setAccountOwnerId(String(meRes.data.id));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setTokenFromOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
