// src/types/navigation.ts

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Search: undefined;
  NewThread: undefined; // Tab giữa để đăng bài
  Activity: undefined;  // Tab thông báo
  ProfileTab: undefined; // Tab cá nhân
};

export type RootStackParamList = {
  Auth: undefined;      // Luồng chưa đăng nhập
  Main: undefined;      // Luồng chính (chứa Bottom Tabs)
  
  // Các màn hình Modal hoặc Fullscreen khác
  EditProfile: undefined;
  NewThread: undefined;
  CommentScreen: { postId: string };
  BookDetail: { bookId?: string };
  Reader: { bookId: string; url: string; lastPosition?: string };
  Challenge: undefined;
  FriendManagement: undefined;
  UserProfile: { userId: string };
  ChatList: undefined;
  ChatRoom: { conversationId: string, conversationName?: string };
  GenreBooks: { genreId: string; genreName: string };
  AllGenres: undefined;
};