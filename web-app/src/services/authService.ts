import axiosClient from '../api/axiosClient';
import type { LoginResponse } from '../types';

const TOKEN_KEY = 'accessToken';

// Hàm đăng nhập
export const logIn = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await axiosClient.post<LoginResponse>('/auth/token', { username, password });
  if (response.data && response.data?.result?.token) {
    localStorage.setItem(TOKEN_KEY, response.data.result.token);
  }
  return response.data;
};

// Hàm đăng xuất
export const logOut = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Hàm kiểm tra đã đăng nhập chưa
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(TOKEN_KEY);
  // Có thể thêm logic kiểm tra token hết hạn ở đây
  return !!token;
};