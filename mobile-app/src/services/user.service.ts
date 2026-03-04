import { UserProfile, Badge } from "../types/user";
import { profileApi } from '../api/profileApi';
import { DEFAULT_AVATAR } from '../constants/theme';

export const userService = {
  async getProfile(): Promise<UserProfile> {
    try {
      // 1. Fetch user profile
      const profileRes: any = await profileApi.getMyProfile();
      const profileData = profileRes.result || profileRes.data?.result || profileRes.data || profileRes;
      
      // 2. Fetch user badges using their explicit ID
      let userBadges: Badge[] = [];
      try {
         if (profileData.id) {
           const badgeRes: any = await profileApi.getUserBadges(profileData.id);
           userBadges = badgeRes.result || badgeRes.data?.result || [];
         }
      } catch (e) {
         console.warn("Could not fetch user badges", e);
      }

      return {
        id: profileData.id,
        username: profileData.username,
        displayName: profileData.displayName || profileData.username,
        avatar: profileData.avatar || DEFAULT_AVATAR,
        bio: profileData.bio || '',
        link: profileData.link || '',
        isPrivate: profileData.isPrivate || false,
        followersCount: profileData.followersCount || 0,
        friendCount: profileData.friendCount || 0,
        totalBooksRead: profileData.totalBooksRead || 0,
        badges: userBadges
      };
    } catch (error) {
       console.error("Failed to fetch profile from API", error);
       throw error;
    }
  },

  async updateProfile(payload: Partial<UserProfile>) {
     try {
       const res: any = await profileApi.updateProfile(payload);
       return res.data || res;
     } catch (e) {
       console.error("Failed to update profile", e);
       throw e;
     }
  },
};
