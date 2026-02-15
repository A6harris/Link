// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Session } from '@supabase/supabase-js';
import type { User } from '../../types';
import * as AuthService from '../../services/supabase/auth';

// ────────────────────────────────────────────────────────────
// State shape
// ────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,
};

// ────────────────────────────────────────────────────────────
// Async thunks
// ────────────────────────────────────────────────────────────

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const session = await AuthService.getSession();
      if (!session) return { session: null, user: null };

      const user = await AuthService.fetchUserProfile(session.user.id);
      return {
        session,
        user: user ?? {
          id: session.user.id,
          display_name: session.user.email ?? '',
          email: session.user.email,
        } as User,
      };
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to restore session');
    }
  },
);

/** Sign in with email + password. */
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { session, user: authUser } = await AuthService.signIn(email, password);
      if (!session || !authUser) throw new Error('Login succeeded but no session returned.');

      const profile = await AuthService.fetchUserProfile(authUser.id);
      const user: User = profile ?? {
        id: authUser.id,
        display_name: authUser.email ?? '',
        email: authUser.email,
      };

      return { session, user };
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Login failed');
    }
  },
);

/** Register with email + password + display name + phone. */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    { email, password, displayName, phone }: { email: string; password: string; displayName: string; phone: string },
    { rejectWithValue },
  ) => {
    try {
      const { session, user: authUser } = await AuthService.signUp(email, password, displayName, phone);
      if (!authUser) throw new Error('Registration succeeded but no user returned.');

      const user: User = {
        id: authUser.id,
        display_name: displayName,
        email: authUser.email,
        phone_number: phone,
      };

      return { session: session ?? null, user };
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Registration failed');
    }
  },
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.signOut();
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Logout failed');
    }
  },
);

// ────────────────────────────────────────────────────────────
// Slice
// ────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.session = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setSession: (state, action: PayloadAction<Session | null>) => {
      state.session = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => { state.isInitializing = true; })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        const { session, user } = action.payload;
        state.session = session;
        state.user = user;
        state.isAuthenticated = !!session;
        state.isInitializing = false;
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isInitializing = false;
        state.error = (action.payload as string) ?? 'Session restore failed';
      });

    builder
      .addCase(loginUser.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        const { session, user } = action.payload;
        state.session = session;
        state.user = user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Login failed';
      });

    builder
      .addCase(registerUser.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => {
        const { session, user } = action.payload;
        state.session = session;
        state.user = user;
        state.isAuthenticated = !!session;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Registration failed';
      });

    builder
      .addCase(logoutUser.pending, (state) => { state.isLoading = true; })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.session = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Logout failed';
      });
  },
});

export const { setUser, clearUser, setSession, setLoading, setError, clearError } = authSlice.actions;
export default authSlice.reducer;
