export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  link: string;
  isPrivate: boolean;
  followersCount: number;
}
