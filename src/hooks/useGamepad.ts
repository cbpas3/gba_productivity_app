import { useEffect, useRef } from 'react';
import { useGamepadStore } from '../store/gamepadStore';
import { emulatorService } from '../services/emulatorService';
import type { GbaButton } from '../types/emulator';

const AXIS_DEAD_ZONE = 0.3;

export function useGamepad() {
  const setConnected = useGamepadStore((s) => s.setConnected);
  const setDisconnected = useGamepadStore((s) => s.setDisconnected);

  const rafRef = useRef<number | null>(null);
  const pressedRef = useRef<Set<GbaButton>>(new Set());

  useEffect(() => {
    function poll() {
      const gamepads = navigator.getGamepads();
      const gp = gamepads.find((g) => g !== null) ?? null;

      if (!gp) {
        rafRef.current = requestAnimationFrame(poll);
        return;
      }

      const { mapping } = useGamepadStore.getState();
      const nextPressed = new Set<GbaButton>();

      for (const bm of mapping.buttonMappings) {
        const btn = gp.buttons[bm.buttonIndex];
        if (btn && btn.pressed) {
          nextPressed.add(bm.gbaButton);
        }
      }

      for (const am of mapping.axisMappings) {
        const val = gp.axes[am.axisIndex] ?? 0;
        const active =
          am.direction === -1 ? val < -AXIS_DEAD_ZONE : val > AXIS_DEAD_ZONE;
        if (active) {
          nextPressed.add(am.gbaButton);
        }
      }

      const prev = pressedRef.current;

      for (const btn of nextPressed) {
        if (!prev.has(btn)) emulatorService.pressButton(btn);
      }
      for (const btn of prev) {
        if (!nextPressed.has(btn)) emulatorService.releaseButton(btn);
      }

      pressedRef.current = nextPressed;
      rafRef.current = requestAnimationFrame(poll);
    }

    function onConnect(e: GamepadEvent) {
      setConnected(e.gamepad.id);
    }

    function onDisconnect() {
      // Release all held buttons on disconnect
      for (const btn of pressedRef.current) {
        emulatorService.releaseButton(btn);
      }
      pressedRef.current = new Set();
      setDisconnected();
    }

    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    rafRef.current = requestAnimationFrame(poll);

    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      for (const btn of pressedRef.current) {
        emulatorService.releaseButton(btn);
      }
      pressedRef.current = new Set();
    };
  }, [setConnected, setDisconnected]);
}
