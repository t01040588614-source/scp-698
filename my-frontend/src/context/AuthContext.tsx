'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, clearAuthSession, getRefreshToken, setAuthToken, setRefreshToken } from '@/lib/api';
import { syncUserDataAfterLogin } from '@/lib/userDataSync';
import { setAccountOwnerId } from '@/services/accountsApi';
import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  clearSession: () => void;
  setTokenFromOAuth: (accessToken: string, refreshToken?: string | null) => Promise<void>;
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
          void syncUserDataAfterLogin();
        } catch {
          clearAuthSession();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await authApi.login(credentials);
    const { accessToken, refreshToken } = res.data;
    setAuthToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);

    const meRes = await authApi.getMe();
    setUser(meRes.data);
    setAccountOwnerId(String(meRes.data.id));
    void syncUserDataAfterLogin();
  }, []);

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      await authApi.register(credentials);
      await login({ email: credentials.email, password: credentials.password });
    },
    [login]
  );

  const clearSession = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    const refresh = getRefreshToken();
    if (refresh) void authApi.logout(refresh).catch(() => undefined);
    clearSession();
    router.push('/');
  }, [clearSession, router]);

  const setTokenFromOAuth = useCallback(async (accessToken: string, refreshToken?: string | null) => {
    setAuthToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    const meRes = await authApi.getMe();
    setUser(meRes.data);
    setAccountOwnerId(String(meRes.data.id));
    void syncUserDataAfterLogin();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      clearSession,
      setTokenFromOAuth,
    }),
    [user, isLoading, login, register, logout, clearSession, setTokenFromOAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
