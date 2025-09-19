// src/types/index.ts

// Dữ liệu người dùng chi tiết
export interface UserDetails {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
  city: string;
}

// Dữ liệu trả về từ API đăng nhập
export interface LoginResponse {
  code: number;
  result: {
    token: string;
    expiryTime: Date;
  };
}

export interface GetPostsResponse {
  code: number;
  result: {
    currentPage: number,
        totalPages: number,
        pageSize: number,
        totalElements: number,
        data: PostData[],
  };
}

// Kiểu cho dữ liệu Post
export interface PostData {
  id: string,
  content: string,
  userId: string,
  username: string,
  created: string,
  createdDate: string,
  modifiedDate: string,
  [key: string]: unknown;
}