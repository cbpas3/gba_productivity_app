import type { GbaButton } from './emulator';

export interface GamepadButtonMapping {
  /** Gamepad button index (from Gamepad.buttons[]) */
  buttonIndex: number;
  gbaButton: GbaButton;
}

export interface GamepadAxisMapping {
  /** Gamepad axis index (from Gamepad.axes[]) */
  axisIndex: number;
  /** -1 for negative direction, 1 for positive direction */
  direction: -1 | 1;
  gbaButton: GbaButton;
}

export interface GamepadMapping {
  name: string;
  buttonMappings: GamepadButtonMapping[];
  axisMappings: GamepadAxisMapping[];
}

export const DEFAULT_GAMEPAD_MAPPING: GamepadMapping = {
  name: 'Default',
  buttonMappings: [
    { buttonIndex: 0, gbaButton: 'A' },
    { buttonIndex: 1, gbaButton: 'B' },
    { buttonIndex: 4, gbaButton: 'L' },
    { buttonIndex: 5, gbaButton: 'R' },
    { buttonIndex: 9, gbaButton: 'Start' },
    { buttonIndex: 8, gbaButton: 'Select' },
    { buttonIndex: 12, gbaButton: 'Up' },
    { buttonIndex: 13, gbaButton: 'Down' },
    { buttonIndex: 14, gbaButton: 'Left' },
    { buttonIndex: 15, gbaButton: 'Right' },
  ],
  axisMappings: [
    { axisIndex: 0, direction: -1, gbaButton: 'Left' },
    { axisIndex: 0, direction:  1, gbaButton: 'Right' },
    { axisIndex: 1, direction: -1, gbaButton: 'Up' },
    { axisIndex: 1, direction:  1, gbaButton: 'Down' },
  ],
};

export const GBA_BUTTONS: GbaButton[] = [
  'A', 'B', 'L', 'R', 'Start', 'Select', 'Up', 'Down', 'Left', 'Right',
];
