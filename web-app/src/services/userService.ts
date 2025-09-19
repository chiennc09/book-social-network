// src/services/userService.ts
import axiosClient from "../api/axiosClient";
import type { UserDetails } from "../types";

// Kiểu dữ liệu API trả về có thể có cấu trúc lồng nhau
interface MyInfoResponse {
  result: UserDetails;
  // các thuộc tính khác nếu có
}

export const getMyInfo = () => {
  // AxiosResponse<MyInfoResponse> -> kiểu dữ liệu cho toàn bộ response trả về
  return axiosClient.get<MyInfoResponse>('/profile/users/my-profile');
};