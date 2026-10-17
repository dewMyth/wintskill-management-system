import { createSlice } from '@reduxjs/toolkit';
import { loggedOut } from './actions';
import { authApi } from './auth-api';
import type { Profile } from './types';

export interface AuthState {
  user: Profile | null;
}

const initialState: AuthState = { user: null };

/** Holds the signed-in profile. Tokens stay inside the Supabase client. */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) =>
    builder
      .addCase(loggedOut, () => initialState)
      .addMatcher(authApi.endpoints.me.matchFulfilled, (state, { payload }) => {
        state.user = payload;
      }),
});
