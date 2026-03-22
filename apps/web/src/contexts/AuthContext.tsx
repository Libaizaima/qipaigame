'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, userApi } from '@/lib/api';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  balance: number;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    balance: 0,
    isLoading: true,
  });

  // 初始化时检查本地存储
  useEffect(() => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setState((s) => ({ ...s, user, token, refreshToken, isLoading: false }));
        // 加载余额
        userApi.getBalance(token).then((data) => {
          setState((s) => ({ ...s, balance: Number(data.balance) }));
        }).catch(() => {});
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await authApi.login({ username, password });
    const { accessToken, refreshToken: rt, user } = data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', rt);
    localStorage.setItem('user', JSON.stringify(user));

    // 获取余额
    let balance = 0;
    try {
      const balData = await userApi.getBalance(accessToken);
      balance = Number(balData.balance);
    } catch {}

    setState({ user, token: accessToken, refreshToken: rt, balance, isLoading: false });
  }, []);

  const register = useCallback(async (username: string, password: string, email?: string) => {
    await authApi.register({ username, password, email });
  }, []);

  const logout = useCallback(async () => {
    if (state.refreshToken) {
      try { await authApi.logout(state.refreshToken); } catch {}
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setState({ user: null, token: null, refreshToken: null, balance: 0, isLoading: false });
  }, [state.refreshToken]);

  const refreshBalance = useCallback(async () => {
    if (state.token) {
      try {
        const data = await userApi.getBalance(state.token);
        setState((s) => ({ ...s, balance: Number(data.balance) }));
      } catch {}
    }
  }, [state.token]);

  const updateBalance = useCallback((newBalance: number) => {
    setState((s) => ({ ...s, balance: newBalance }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshBalance, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
