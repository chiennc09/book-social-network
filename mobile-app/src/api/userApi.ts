import axiosClient from './axiosClient';

export const userApi = {
  getProfile: () => axiosClient.get('/me'),
  updateProfile: (payload: any) =>
    axiosClient.put('/me', payload),
};
