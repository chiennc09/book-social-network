import api from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  authenticated: boolean;
}

export const authApi = {
  login: async (req: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post('/identity/auth/token', req);
    return res.data.result;
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      await api.post('/identity/auth/logout', { token }).catch(() => {});
    }
    localStorage.removeItem('admin_token');
  },

  introspect: async (): Promise<boolean> => {
    const token = localStorage.getItem('admin_token');
    if (!token) return false;
    try {
      const res = await api.post('/identity/auth/introspect', { token });
      return res.data.result?.valid === true;
    } catch {
      return false;
    }
  },
};
