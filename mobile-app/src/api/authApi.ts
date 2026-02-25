import axiosClient from './axiosClient';

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    axiosClient.post('/auth/token', payload),
  refreshToken: (payload: { token: string }) =>
    axiosClient.post('/auth/refresh', payload),
};
