import axios from 'axios';
import { SERVICE_PATHS } from '../config/env';
import storage from '../utils/storage';

/**
 * Dedicated Axios client for book-service.
 * Routes through API Gateway: {GATEWAY}/books
 *
 * Separate from the identity axiosClient because:
 *  - Different base URL prefix
 *  - Intercepts response.data directly (Spring returns ApiResponse wrapper)
 */
const bookAxiosClient = axios.create({
  baseURL: SERVICE_PATHS.books,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

// ── Request Interceptor: attach JWT ─────────────────────────────────────────
bookAxiosClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[bookAxiosClient] Failed to get token', error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor: unwrap Spring ApiResponse ─────────────────────────
bookAxiosClient.interceptors.response.use(
  (response) => {
    // Spring returns { code, result, message } — pass through data so that
    // callers can access both resp.result and resp.data depending on the screen
    if (response?.data) return response.data;
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Token expired — book calls rely on the identity client to handle refresh;
      // here we just propagate 401 cleanly so the app can redirect to login.
    }
    return Promise.reject(error.response?.data || error);
  },
);

export default bookAxiosClient;
