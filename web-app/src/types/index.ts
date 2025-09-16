// src/types/index.ts

// Dữ liệu người dùng chi tiết
export interface UserDetails {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  dob: string; // Giữ là string cho đơn giản, hoặc có thể dùng Date
}

// Dữ liệu trả về từ API đăng nhập
export interface LoginResponse {
  code: number;
  // Giả sử API trả về thêm thông tin user
  result: {
    token: string;
    expiryTime: Date;
  };
}