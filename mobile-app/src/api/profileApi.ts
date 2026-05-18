import axiosClient from './axiosClient';
import { SERVICE_PATHS } from '../config/env';

const BASE_URL = SERVICE_PATHS.profile;

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
  declineFriend: (toUserId: string) => axiosClient.post(`${BASE_URL}/friend/decline?toUserId=${toUserId}`),
  removeFriend: (toUserId: string) => axiosClient.delete(`${BASE_URL}/friend/remove?toUserId=${toUserId}`),
  getIncomingRequests: () => axiosClient.get(`${BASE_URL}/friend/requests/incoming`),
  getOutgoingRequests: () => axiosClient.get(`${BASE_URL}/friend/requests/outgoing`),
  getFriends: () => axiosClient.get(`${BASE_URL}/friend/list`),

  getLeaderboard: (limit: number = 20) => {
    return axiosClient.get(`${BASE_URL}/users/leaderboard?limit=${limit}`);
  },

  searchUsers: (query: string) => axiosClient.get(`${BASE_URL}/users/search?q=${query}`),
  getUserProfile: (userId: string) => axiosClient.get(`${BASE_URL}/users/${userId}`),
};
