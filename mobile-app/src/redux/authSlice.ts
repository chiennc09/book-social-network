import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../services/auth.service';

interface User {
  id: string;
  username: string;
  scope: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isInitializing: boolean; // Trạng thái kiểm tra token lúc mở app
  isLoading: boolean;      // Trạng thái đang gọi API (Login/Register)
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isInitializing: true, 
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Async Thunks - Các hành động bất đồng bộ
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ username, password }: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await authService.login(username, password);
      return data;
    } catch (error: any) {
      // Trả về lỗi để Redux xử lý
      return rejectWithValue(error.response?.data?.message || 'Đăng nhập thất bại');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const loadUser = createAsyncThunk('auth/loadUser', async () => {
  const token = await authService.getToken();
  if (!token) return null;
  
  const user = await authService.getUserFromToken();
  if (!user) return null;

  return { token, user };
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateUserAvatar: (state, action: PayloadAction<string>) => {
      if (state.user) {
         (state.user as any).avatar = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    });

    // Load User
    builder.addCase(loadUser.pending, (state) => {
        state.isInitializing = true;
    });
    builder.addCase(loadUser.fulfilled, (state, action) => {
      state.isInitializing = false;
      if (action.payload) {
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
      } else {
        state.isAuthenticated = false;
      }
    });
    builder.addCase(loadUser.rejected, (state) => {
      state.isInitializing = false;
      state.isAuthenticated = false;
    });
  },
});

export const { setLoading, updateUserAvatar } = authSlice.actions;
export default authSlice.reducer;
