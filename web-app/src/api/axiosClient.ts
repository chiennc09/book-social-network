// src/api/axiosClient.ts - Refactored for production-ready setup
import axios from 'axios';

/**
 * Axios client configured for API Gateway routing
 * Handles JWT token management and error handling
 */

const getApiUrl = () => {
  return (import.meta.env.VITE_API_URL as string) || 'http://localhost:8888';
};

const axiosClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Token
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Handle 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Attempt token refresh on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token, must re-login
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${getApiUrl()}/identity/auth/refresh`,
          { token: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const { result } = response.data;
        if (result?.token) {
          localStorage.setItem('accessToken', result.token);
          originalRequest.headers.Authorization = `Bearer ${result.token}`;
          return axiosClient(originalRequest);
        }
      } catch (refreshError) {
        // Clear auth data on refresh failure
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;
