// src/api/bookAxiosClient.ts
import axios from 'axios';
import storage from '../utils/storage';

const bookAxiosClient = axios.create({
  baseURL: 'http://10.0.2.2:8085/books', // Cổng 8085 cho Service sách
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
bookAxiosClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Xử lý dữ liệu trả về và lỗi 401
bookAxiosClient.interceptors.response.use(
  (response) => {
    // API Spring Boot trả về cấu trúc ApiResponse { code, result, message }
    // Trả về data trực tiếp để dễ xử lý
    if (response && response.data) {
        return response.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // TODO: Xử lý refresh token tương tự interceptor của identity hoặc gọi hàm dùng chung
    if (error.response?.status === 401 && !originalRequest._retry) {
      // originalRequest._retry = true;
      // Implement refresh token if needed, or redirect to login.
      // Vì logic refresh có ở axiosClient (Identity), ta có thể tận dụng hoặc để nó logout.
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default bookAxiosClient;
