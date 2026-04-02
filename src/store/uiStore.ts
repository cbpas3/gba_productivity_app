import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (hasSeen: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      hasSeenTutorial: false,
      setHasSeenTutorial: (hasSeen) => set({ hasSeenTutorial: hasSeen }),
    }),
    {
      name: 'gba-ui-prefs',
    }
  )
);
