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
  toggleInput(enabled: boolean): void;
  setFastForward(enabled: boolean): void;
  getStatus(): EmulatorStatus;

  /**
   * Register a callback that fires whenever mGBA flushes the save chip to the
   * VFS. Use this to trigger cloud save uploads. Pass null to unregister.
   */
  setSaveCallback(cb: (() => void) | null): void;

  /**
   * Stage raw save data to be injected immediately after the next loadRom call.
   * Use this to restore a cloud save before the user picks a ROM file.
   */
  stageSaveForNextLoad(data: Uint8Array): void;
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
