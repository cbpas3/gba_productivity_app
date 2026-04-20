import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GamepadMapping } from '../types/gamepad';
import { DEFAULT_GAMEPAD_MAPPING } from '../types/gamepad';

interface GamepadState {
  isConnected: boolean;
  gamepadId: string | null;
  mapping: GamepadMapping;
  setConnected: (id: string) => void;
  setDisconnected: () => void;
  setMapping: (mapping: GamepadMapping) => void;
  resetMapping: () => void;
}

export const useGamepadStore = create<GamepadState>()(
  persist(
    (set) => ({
      isConnected: false,
      gamepadId: null,
      mapping: DEFAULT_GAMEPAD_MAPPING,

      setConnected: (id) => set({ isConnected: true, gamepadId: id }),
      setDisconnected: () => set({ isConnected: false, gamepadId: null }),
      setMapping: (mapping) => set({ mapping }),
      resetMapping: () => set({ mapping: DEFAULT_GAMEPAD_MAPPING }),
    }),
    {
      name: 'gba-gamepad',
      partialize: (s) => ({ mapping: s.mapping }),
      // Migrate persisted mappings that predate actionMappings field
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { mapping?: Partial<GamepadMapping> };
        return {
          ...current,
          mapping: {
            ...DEFAULT_GAMEPAD_MAPPING,
            ...(p.mapping ?? {}),
            actionMappings: p.mapping?.actionMappings ?? [],
          },
        };
      },
    }
  )
);
