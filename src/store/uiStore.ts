import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MobileControlAlignment = 'default' | 'left' | 'right';

interface UiState {
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (hasSeen: boolean) => void;
  mobileControlAlignment: MobileControlAlignment;
  setMobileControlAlignment: (alignment: MobileControlAlignment) => void;
  isTaskBoardOpen: boolean;
  setIsTaskBoardOpen: (isOpen: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      hasSeenTutorial: false,
      setHasSeenTutorial: (hasSeen) => set({ hasSeenTutorial: hasSeen }),
      mobileControlAlignment: 'default',
      setMobileControlAlignment: (alignment) => set({ mobileControlAlignment: alignment }),
      isTaskBoardOpen: false,
      setIsTaskBoardOpen: (isOpen) => set({ isTaskBoardOpen: isOpen }),
    }),
    {
      name: 'gba-ui-prefs',
    }
  )
);
