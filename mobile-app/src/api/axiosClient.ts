import axios from 'axios';
import storage from '../utils/storage';

const axiosClient = axios.create({
  baseURL: 'http://10.0.2.2:8080/identity', // Adjust for Android Emulator
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
axiosClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Refresh
axiosClient.interceptors.response.use(
  (response) => {
    if (response && response.data) {
        return response.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Remove baseURL from url to avoid double prefixing on retry if axios behaves that way (sometimes it does)
    // But axios usually handles this.

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Call refresh token endpoint
        // NOTE: We use a new axios instance or fetch to avoid infinite loops if refresh fails
        const oldToken = await storage.getToken();
        if (!oldToken) {
             return Promise.reject(error);
        }

        const response = await axios.post('http://10.0.2.2:8080/identity/auth/refresh', {
            token: oldToken
        });

        const { result } = response.data;
        
        if (result && result.token) {
            await storage.setToken(result.token);
            
            // Update the header for the ORIGINAL request
            originalRequest.headers.Authorization = `Bearer ${result.token}`;
            
            // Retry the original request
            return axiosClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - Logout user
        // We might need to dispatch a logout action here, but we can't import store directly easily (dependency cycle).
        // A common pattern is to clear storage and let the UI react, or use a callback.
        await storage.clearTokens();
        // Ideally, emit an event or use a singleton store reference injected later.
        // For now, simple error propagation.
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;
