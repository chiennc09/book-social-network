export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
}

export interface Book {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  category?: string;
  coverImage?: string;
  pdfPath?: string;
  epubPath?: string;
  isPublic?: boolean;
  totalViews?: number;
  totalPages: number;
  averageRating?: number;
  lastPosition?: string;
  progressPercent?: number;

  // Giữ lại các trường cũ dạng optional để tránh vỡ UI tạm thời
  author?: string;
  coverUrl?: string;
  status?: string;
  progress?: number;
  totalPage?: number;
  currentPage?: number;
}

export interface Post {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  content: string;
  book?: Book; // Trường này bắt buộc hoặc optional tùy logic (ở đây để optional để tránh lỗi data cũ)
  images?: string[]; // Ảnh người dùng đăng kèm (ngoài ảnh bìa sách)
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  timestamp: string; // VD: "2 giờ", "1 ngày"
  isLiked?: boolean;
  isRepost?: boolean;
}