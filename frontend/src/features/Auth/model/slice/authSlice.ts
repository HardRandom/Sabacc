import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthSchema } from '../types/authSchema';
import { authApi } from '../services/authService';
import { User } from '../types/auth';
import { USER_LOCALSTORAGE_KEY } from '@/shared/const/localstorage';

const initialState: AuthSchema = {
  user: null,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.error = null;
      localStorage.removeItem(USER_LOCALSTORAGE_KEY);
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem(USER_LOCALSTORAGE_KEY, JSON.stringify(action.payload));
    },
    checkSessionExpiration: (state) => {
      const storedUser = localStorage.getItem(USER_LOCALSTORAGE_KEY);
      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        const currentTime = new Date().getTime();
        const expirationTime = new Date(user.expireAt).getTime();

        if (currentTime >= expirationTime) {
          console.error('Session expired')
          state.user = null;
          state.error = 'Session expired';
          localStorage.removeItem(USER_LOCALSTORAGE_KEY);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.createAnonymousUser.matchFulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        localStorage.setItem(USER_LOCALSTORAGE_KEY, JSON.stringify(action.payload))
      })
      .addMatcher(authApi.endpoints.createAnonymousUser.matchRejected, (state, action: PayloadAction<any>) => {
        state.error = action.payload;
      })
  },
});

export const { logout, setUser,checkSessionExpiration } = authSlice.actions;
export const authReducer = authSlice.reducer
