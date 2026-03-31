import { useEffect } from 'react';
import { emulatorService } from '../services/emulatorService';
import type { GbaButton } from '../types/emulator';

/**
 * Maps DOM KeyboardEvent.key values to GBA button names.
 *
 * ArrowUp/Down/Left/Right  -> Up / Down / Left / Right (D-pad)
 * x / X                   -> A
 * z / Z                   -> B
 * Enter                   -> Start
 * Backspace                -> Select
 * a / A                   -> L (left shoulder)
 * s / S                   -> R (right shoulder)
 */
const MAPPED_KEYS: Readonly<Record<string, GbaButton>> = {
  ArrowUp:    'Up',
  ArrowDown:  'Down',
  ArrowLeft:  'Left',
  ArrowRight: 'Right',
  x:          'A',
  X:          'A',
  z:          'B',
  Z:          'B',
  Enter:      'Start',
  Backspace:  'Select',
  a:          'L',
  A:          'L',
  s:          'R',
  S:          'R',
};

/**
 * Returns true when the keyboard event originates from an element that
 * accepts text input (input, textarea, select, or contentEditable).
 * In that case the GBA shortcut keys should NOT be intercepted.
 */
function isTypingTarget(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((e.target as HTMLElement)?.isContentEditable) return true;
  return false;
}

export function useKeyboardInput(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e)) return;

      const button = MAPPED_KEYS[e.key];
      if (button === undefined) return;

      // Prevent browser defaults (e.g. Backspace navigating back, arrow scrolling)
      e.preventDefault();
      emulatorService.pressButton(button);
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (isTypingTarget(e)) return;

      const button = MAPPED_KEYS[e.key];
      if (button === undefined) return;

      e.preventDefault();
      emulatorService.releaseButton(button);
    }

    // Disable mGBA's internal SDL2 keyboard capture when a text field is
    // focused so the user can actually type. Re-enable when focus leaves.
    function handleFocusIn(e: FocusEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
          || (e.target as HTMLElement)?.isContentEditable) {
        emulatorService.toggleInput(false);
      }
    }

    function handleFocusOut(e: FocusEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
          || (e.target as HTMLElement)?.isContentEditable) {
        emulatorService.toggleInput(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);
}
