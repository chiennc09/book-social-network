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

  // ----- Friends Management -----
  sendFriendRequest: (toUserId: string) => axiosClient.post(`${BASE_URL}/friend/request?toUserId=${toUserId}`),
  acceptFriend: (toUserId: string) => axiosClient.post(`${BASE_URL}/friend/accept?toUserId=${toUserId}`),
  removeFriend: (toUserId: string) => axiosClient.delete(`${BASE_URL}/friend/remove?toUserId=${toUserId}`),
  getIncomingRequests: () => axiosClient.get(`${BASE_URL}/friend/requests/incoming`),
  getOutgoingRequests: () => axiosClient.get(`${BASE_URL}/friend/requests/outgoing`),
  getFriends: () => axiosClient.get(`${BASE_URL}/friend/list`),

  getLeaderboard: (limit: number = 20) => {
    return axiosClient.get(`${BASE_URL}/users/leaderboard?limit=${limit}`);
  }
};
