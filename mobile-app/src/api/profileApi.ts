import axiosClient from './axiosClient';

const BASE_URL = 'http://10.0.2.2:8091/profile'; // User requested port 8081

export const profileApi = {
  getMyProfile: () => {
    return axiosClient.get(`${BASE_URL}/users/my-profile`);
  },
  
  getProfileByUserId: (userId: string) => {
    return axiosClient.get(`${BASE_URL}/users/${userId}`);
  },

  updateProfile: (data: any) => {
    return axiosClient.put(`${BASE_URL}/users/my-profile`, data); // or whatever the actual endpoint is
  },

  getAllBadges: () => {
    return axiosClient.get(`${BASE_URL}/badges`);
  },

  getUserBadges: (userId: string) => {
    return axiosClient.get(`${BASE_URL}/users/${userId}/badges`);
  },

  getLeaderboard: (limit: number = 20) => {
    return axiosClient.get(`${BASE_URL}/users/leaderboard?limit=${limit}`);
  }
};
