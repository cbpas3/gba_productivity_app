import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MobileControlAlignment = 'default' | 'left' | 'right';
export type ActiveTab = 'tasks' | 'play';

interface UiState {
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (hasSeen: boolean) => void;
  mobileControlAlignment: MobileControlAlignment;
  setMobileControlAlignment: (alignment: MobileControlAlignment) => void;
  isTaskBoardOpen: boolean;
  setIsTaskBoardOpen: (isOpen: boolean) => void;
  isBulkImportOpen: boolean;
  setIsBulkImportOpen: (isOpen: boolean) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isAccountOpen: boolean;
  setIsAccountOpen: (isOpen: boolean) => void;
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
      isBulkImportOpen: false,
      setIsBulkImportOpen: (isOpen) => set({ isBulkImportOpen: isOpen }),
      activeTab: 'tasks',
      setActiveTab: (tab) => set({ activeTab: tab }),
      isAccountOpen: false,
      setIsAccountOpen: (isOpen) => set({ isAccountOpen: isOpen }),
    }),
    {
      name: 'gba-ui-prefs',
    }
  )
);
