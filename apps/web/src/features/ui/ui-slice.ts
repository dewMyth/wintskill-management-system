import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';

export interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
}

const initialState: UiState = { theme: 'light', sidebarCollapsed: false };

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    themeChanged: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    sidebarToggled: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const { themeChanged, sidebarToggled } = uiSlice.actions;
