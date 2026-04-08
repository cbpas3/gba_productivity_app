import { create } from 'zustand';
import type { EmulatorState, EmulatorStatus } from '../types/emulator';
import { emulatorService } from '../services/emulatorService';
import { uploadSave } from '../services/syncService';
import { useAuthStore } from './authStore';

interface EmulatorStoreState extends EmulatorState {
  setStatus: (status: EmulatorStatus) => void;
  setRomLoaded: (name: string) => void;
  setError: (msg: string) => void;
  reset: () => void;
  isFastForward: boolean;
  toggleFastForward: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (isFs: boolean) => void;
  lastSaveSyncTime: number | null;
  isSyncingSave: boolean;
  setLastSaveSyncTime: (ts: number) => void;
  forceSyncSave: () => Promise<void>;
}

const initialState: EmulatorState = {
  status: 'idle',
  romLoaded: false,
  gameName: null,
  errorMessage: null,
};

export const useEmulatorStore = create<EmulatorStoreState>()((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setRomLoaded: (name) =>
    set({
      romLoaded: true,
      gameName: name,
      status: 'running',
      errorMessage: null,
    }),

  setError: (msg) =>
    set({
      status: 'error',
      errorMessage: msg,
    }),

  reset: () => set({ ...initialState }),

  isFastForward: false,
  toggleFastForward: () => set((s) => ({ isFastForward: !s.isFastForward })),

  isFullscreen: false,
  setIsFullscreen: (isFs) => set({ isFullscreen: isFs }),

  lastSaveSyncTime: null,
  isSyncingSave: false,
  setLastSaveSyncTime: (ts) => set({ lastSaveSyncTime: ts }),

  forceSyncSave: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    set({ isSyncingSave: true });
    try {
      const data = emulatorService.getCurrentSave();
      if (!data) throw new Error('No save data available');
      await uploadSave(userId, data);
      set({ lastSaveSyncTime: Date.now(), isSyncingSave: false });
    } catch (err) {
      console.error('[EmulatorStore] forceSyncSave failed:', err);
      set({ isSyncingSave: false });
    }
  },
}));
