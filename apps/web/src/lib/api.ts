const isServer = typeof window === 'undefined';
const API_BASE = isServer 
  ? (process.env.INTERNAL_API_URL || 'http://localhost:6989/api')
  : (process.env.NEXT_PUBLIC_API_URL || '/api');

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string;
}

export async function api<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `API Error: ${res.status}`);
  }

  return data.data ?? data;
}

// ===== Auth =====
export const authApi = {
  register: (body: { username: string; password: string; email?: string }) =>
    api('/auth/register', { method: 'POST', body }),

  login: (body: { username: string; password: string }) =>
    api('/auth/login', { method: 'POST', body }),

  refresh: (refreshToken: string) =>
    api('/auth/refresh', { method: 'POST', body: { refreshToken } }),

  logout: (refreshToken: string) =>
    api('/auth/logout', { method: 'POST', body: { refreshToken } }),
};

// ===== User =====
export const userApi = {
  getProfile: (token: string) =>
    api('/users/me', { token }),

  getBalance: (token: string) =>
    api('/users/me/balance', { token }),
};

// ===== Games & Rooms =====
export const gameApi = {
  getGames: () => api('/games'),
  getRooms: (gameCode?: string) =>
    api(`/rooms${gameCode ? `?game=${gameCode}` : ''}`),
  getRoomDetail: (roomId: string) =>
    api(`/rooms/${roomId}`),
};

// ===== Bets =====
export const betApi = {
  placeBet: (token: string, body: {
    roomId: string;
    betType: string;
    betAmount: number;
    idempotencyKey?: string;
  }) => api('/bets', { method: 'POST', body, token }),

  getMyBets: (token: string, page = 1, limit = 20) =>
    api(`/bets/my?page=${page}&limit=${limit}`, { token }),
};

// ===== History =====
export const historyApi = {
  getRounds: (params?: { game?: string; roomId?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.game) sp.set('game', params.game);
    if (params?.roomId) sp.set('roomId', params.roomId);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    return api(`/history/rounds?${sp.toString()}`);
  },
  getBaccarat: (page = 1) => api(`/history/baccarat?page=${page}`),
  getDice: (page = 1) => api(`/history/dice?page=${page}`),
};

// ===== Wallet =====
export const walletApi = {
  getTransactions: (token: string, page = 1, limit = 20) =>
    api(`/wallet/transactions?page=${page}&limit=${limit}`, { token }),
};

// ===== Admin =====
export const adminApi = {
  getUsers: (token: string, page = 1, limit = 20) =>
    api(`/admin/users?page=${page}&limit=${limit}`, { token }),

  adjustBalance: (token: string, userId: string, body: { amount: number; reason: string }) =>
    api(`/admin/users/${userId}/adjust-balance`, { method: 'POST', body, token }),

  banUser: (token: string, userId: string) =>
    api(`/admin/users/${userId}/ban`, { method: 'POST', token }),

  activateUser: (token: string, userId: string) =>
    api(`/admin/users/${userId}/activate`, { method: 'POST', token }),

  getBets: (token: string, page = 1, limit = 20) =>
    api(`/admin/bets?page=${page}&limit=${limit}`, { token }),

  getTransactions: (token: string, page = 1, limit = 20) =>
    api(`/admin/transactions?page=${page}&limit=${limit}`, { token }),
};

// ===== Solo Baccarat =====
export const soloApi = {
  play: (token: string, bets: { betType: string; betAmount: number }[]) =>
    api('/solo/baccarat/play', { method: 'POST', body: { bets }, token }),

  getHistory: (token: string, page = 1, limit = 20) =>
    api(`/solo/baccarat/history?page=${page}&limit=${limit}`, { token }),
};
