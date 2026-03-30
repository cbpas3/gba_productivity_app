export type EmulatorStatus = 'idle' | 'loading' | 'running' | 'paused' | 'error';

export interface EmulatorState {
  status: EmulatorStatus;
  romLoaded: boolean;
  gameName: string | null;
  errorMessage: string | null;
}

/** The interface the emulator service exposes to the rest of the app */
export interface IEmulatorService {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  loadRom(file: File): Promise<boolean>;
  loadSave(file: File): Promise<void>;
  getCurrentSave(): Uint8Array | null;
  writeSaveAndReload(saveData: Uint8Array): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  pressButton(button: GbaButton): void;
  releaseButton(button: GbaButton): void;
  getStatus(): EmulatorStatus;
}

export type GbaButton =
  | 'A'
  | 'B'
  | 'L'
  | 'R'
  | 'Start'
  | 'Select'
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right';
