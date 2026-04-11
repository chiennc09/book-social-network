import axiosClient from './axiosClient';

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    axiosClient.post('/auth/token', payload),
  refreshToken: (payload: { token: string }) =>
    axiosClient.post('/auth/refresh', payload),
  register: (payload: {
    username: string;
    password: string;
    email: string;
    firstName?: string;
    lastName?: string;
    dob?: string;        // ISO date string YYYY-MM-DD
    city?: string;
  }) => axiosClient.post('/users/registration', payload),
};
