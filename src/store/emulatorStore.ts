import { create } from 'zustand';
import type { EmulatorState, EmulatorStatus } from '../types/emulator';
import { emulatorService } from '../services/emulatorService';
import { uploadSave, downloadSave } from '../services/syncService';
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
  volume: number;
  setVolume: (percent: number) => void;
  lastSaveSyncTime: number | null;
  isSyncing: boolean;
  lastSyncStatus: 'success' | 'error' | null;
  setSyncStatus: (s: 'success' | 'error' | null) => void;
  pushSave: () => Promise<void>;
  pullSave: () => Promise<void>;
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

  volume: 100,
  setVolume: (percent) => {
    emulatorService.setVolume(percent);
    set({ volume: percent });
  },

  lastSaveSyncTime: null,
  isSyncing: false,
  lastSyncStatus: null,
  setSyncStatus: (s) => set({ lastSyncStatus: s }),

  pushSave: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    set({ isSyncing: true, lastSyncStatus: null });
    try {
      const data = emulatorService.getCurrentSave();
      if (!data) throw new Error('No save data available');
      await uploadSave(userId, data);
      set({ isSyncing: false, lastSaveSyncTime: Date.now(), lastSyncStatus: 'success' });
    } catch (err) {
      console.error('[EmulatorStore] pushSave failed:', err);
      set({ isSyncing: false, lastSyncStatus: 'error' });
    }
  },

  pullSave: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    set({ isSyncing: true, lastSyncStatus: null });
    try {
      const data = await downloadSave(userId);
      if (!data) throw new Error('No cloud save found');
      if (emulatorService.getStatus() === 'running') {
        await emulatorService.writeSaveAndReload(data);
      } else {
        emulatorService.stageSaveForNextLoad(data);
      }
      set({ isSyncing: false, lastSaveSyncTime: Date.now(), lastSyncStatus: 'success' });
    } catch (err) {
      console.error('[EmulatorStore] pullSave failed:', err);
      set({ isSyncing: false, lastSyncStatus: 'error' });
    }
  },
}));
