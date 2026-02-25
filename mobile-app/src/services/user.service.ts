import { UserProfile } from "../types/user";

export const userService = {
  async getProfile(): Promise<UserProfile> {
    // --- REAL API (Uncomment later) ---
    // const res = await userApi.getProfile();
    // return {
    //   id: res.id,
    //   username: res.username,
    //   displayName: res.displayName,
    //   avatar: res.avatar,
    //   bio: res.bio ?? '',
    //   link: res.link ?? '',
    //   isPrivate: res.isPrivate ?? false,
    //   followersCount: res.followersCount ?? 0,
    // };

    // --- FAKE DATA (Simulate Network Request) ---
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: '123',
          username: '_chie.nc',
          displayName: 'Chien Pham',
          avatar: 'https://picsum.photos/500/300',
          bio: 'Hehe',
          link: 'https://github.com/chiennc09',
          isPrivate: false,
          followersCount: 15,
        });
      }, 500); // Giả lập độ trễ mạng 0.5s
    });
  },

  async updateProfile(payload: Partial<UserProfile>) {
    // --- REAL API (Uncomment later) ---
    // return userApi.updateProfile(payload);

    // --- FAKE DATA ---
    console.log('Mock API Update Profile:', payload);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 1000);
    });
  },
};