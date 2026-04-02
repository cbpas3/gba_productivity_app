import { create } from 'zustand';
import type { EmulatorState, EmulatorStatus } from '../types/emulator';

interface EmulatorStoreState extends EmulatorState {
  setStatus: (status: EmulatorStatus) => void;
  setRomLoaded: (name: string) => void;
  setError: (msg: string) => void;
  reset: () => void;
  isFastForward: boolean;
  toggleFastForward: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (isFs: boolean) => void;
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
}));
