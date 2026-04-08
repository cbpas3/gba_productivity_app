import { create } from 'zustand';
import type { EmulatorState, EmulatorStatus } from '../types/emulator';
import { emulatorService } from '../services/emulatorService';
import { downloadSave } from '../services/syncService';
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
  lastSyncStatus: 'success' | 'error' | null;
  setLastSaveSyncTime: (ts: number) => void;
  setSyncStatus: (s: 'success' | 'error' | null) => void;
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
  lastSyncStatus: null,
  setLastSaveSyncTime: (ts) => set({ lastSaveSyncTime: ts }),
  setSyncStatus: (s) => set({ lastSyncStatus: s }),

  forceSyncSave: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    set({ isSyncingSave: true });
    try {
      // Download the cloud save and apply it to the running game.
      // Upload is already handled automatically by the debounced callback in
      // PlayRoom — manual sync means "pull from cloud".
      const data = await downloadSave(userId);
      if (!data) throw new Error('No cloud save found');

      if (emulatorService.getStatus() === 'running') {
        // ROM is loaded — inject immediately via the full reload cycle.
        await emulatorService.writeSaveAndReload(data);
      } else {
        // No ROM loaded yet — stage it so it loads on the next ROM pick.
        emulatorService.stageSaveForNextLoad(data);
      }

      set({ lastSaveSyncTime: Date.now(), isSyncingSave: false, lastSyncStatus: 'success' });
    } catch (err) {
      console.error('[EmulatorStore] forceSyncSave failed:', err);
      set({ isSyncingSave: false, lastSyncStatus: 'error' });
    }
  },
}));
