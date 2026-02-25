export interface Badge {
  code: string;
  name: string;
  description: string;
  iconUrl?: string;
  requiredBooks: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  link: string;
  isPrivate: boolean;
  followersCount: number;
  userId?: string; 
  totalBooksRead?: number;
  badges?: Badge[];
}
