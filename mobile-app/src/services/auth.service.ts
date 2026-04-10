import { authApi } from '../api/authApi';
import storage from '../utils/storage';
import { jwtDecode } from 'jwt-decode';

interface LoginResponse {
  code: number;
  result: {
    token: string;
    expiryTime: string;
  };
}

interface DecodedToken {
  sub: string;
  userId: string;
  scope: string;
  exp: number;
  iat: number;
  jti: string;
  iss: string;
}

export const authService = {
  // Hàm đăng nhập
  async login(username: string, password: string) {
    try {
      const response = await authApi.login({ username, password });
      const data = (response as any).data as LoginResponse;

      if (data && (data.code === 1000 || !!data.result?.token)) {
        const token = data.result?.token || (data as any).token;
        if (!token) {
          throw new Error('Token đăng nhập không tồn tại');
        }

        // Lưu token vào storage
        await storage.setToken(token);
        
        // Giải mã token để lấy thông tin user
        const decoded: DecodedToken = jwtDecode(token);
        
        return {
          token,
          user: {
            id: decoded.userId,
            username: decoded.sub,
            scope: decoded.scope,
          },
        };
      }

      throw new Error('Đăng nhập thất bại');
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // Hàm đăng xuất: Xóa token khỏi storage
  async logout() {
    await storage.clearTokens();
  },

  // Lấy token hiện tại
  async getToken() {
    return await storage.getToken();
  },
  
  // Lấy thông tin user từ token lưu trong storage
  async getUserFromToken() {
    const token = await storage.getToken();
    if (token) {
        try {
            const decoded: DecodedToken = jwtDecode(token);
            return {
                id: decoded.userId,
                username: decoded.sub,
                scope: decoded.scope,
            };
        } catch (e) {
            return null;
        }
    }
    return null;
  }
};
