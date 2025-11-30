import { create } from 'zustand';
import type { Reading, Settings, ReadingStatistics } from '../types';

interface AppState {
  // Readings State
  readings: Reading[];
  statistics: ReadingStatistics | null;
  isLoadingReadings: boolean;

  // Settings State
  settings: Settings | null;

  // UI State
  showOnboarding: boolean;

  // Actions
  setReadings: (readings: Reading[]) => void;
  setStatistics: (statistics: ReadingStatistics) => void;
  setSettings: (settings: Settings) => void;
  setShowOnboarding: (show: boolean) => void;
  setIsLoadingReadings: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial State
  readings: [],
  statistics: null,
  settings: null,
  isLoadingReadings: false,
  showOnboarding: false,

  // Actions
  setReadings: (readings) => set({ readings }),
  setStatistics: (statistics) => set({ statistics }),
  setSettings: (settings) => set({ settings }),
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setIsLoadingReadings: (loading) => set({ isLoadingReadings: loading }),
}));
