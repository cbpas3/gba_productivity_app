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

export type AppAction = 'turbo_a' | 'turbo_b' | 'speed_up';

export interface GamepadActionMapping {
  /** Gamepad button index that triggers this action (edge-triggered on press) */
  buttonIndex: number;
  action: AppAction;
}

export interface GamepadMapping {
  name: string;
  buttonMappings: GamepadButtonMapping[];
  axisMappings: GamepadAxisMapping[];
  actionMappings: GamepadActionMapping[];
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
  actionMappings: [],
};

export const GBA_BUTTONS: GbaButton[] = [
  'A', 'B', 'L', 'R', 'Start', 'Select', 'Up', 'Down', 'Left', 'Right',
];

export const APP_ACTION_LABELS: Record<AppAction, string> = {
  turbo_a: 'Turbo A',
  turbo_b: 'Turbo B',
  speed_up: 'Speed Cycle',
};

export const APP_ACTIONS: AppAction[] = ['turbo_a', 'turbo_b', 'speed_up'];
