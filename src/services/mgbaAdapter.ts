/**
 * Type definitions and helpers for the @thenick775/mgba-wasm module.
 *
 * mGBA runs on the main thread via Emscripten + SDL2. The module is obtained
 * by calling the default export `mGBA({ canvas })` which returns a Promise
 * resolving to an MgbaModule instance. After construction, `FSInit()` must be
 * called once to mount the IndexedDB-backed virtual filesystem.
 */

// ---------------------------------------------------------------------------
// Virtual filesystem path constants
// ---------------------------------------------------------------------------

export const MGBA_PATHS = {
  GAMES: "/data/games",
  SAVES: "/data/saves",
} as const;

// ---------------------------------------------------------------------------
// MgbaModule interface
// ---------------------------------------------------------------------------

/**
 * The object returned by `await mGBA({ canvas })`.
 *
 * Only the subset of the Emscripten API that this application uses is typed
 * here. Additional mGBA-specific methods are included as documented by
 * @thenick775/mgba-wasm.
 */
export interface MgbaModule {
  // Filesystem lifecycle -------------------------------------------------

  /** Mounts the persistent IndexedDB-backed VFS. Must be awaited first. */
  FSInit(): Promise<void>;

  /** Flushes the in-memory filesystem back to IndexedDB. */
  FSSync(): Promise<void>;

  // Game lifecycle -------------------------------------------------------

  /** Loads a ROM and starts emulation. Optional save path override. */
  loadGame(romPath: string, savePathOverride?: string): boolean;

  /** Stops the currently running game. */
  quitGame(): void;

  /** Reloads the current ROM from disk (picks up save changes). */
  quickReload(): void;

  /** Pauses game emulation. */
  pauseGame(): void;

  /** Resumes game emulation and audio. */
  resumeGame(): void;

  // Input ----------------------------------------------------------------

  buttonPress(name: string): void;
  buttonUnpress(name: string): void;
  toggleInput(enabled: boolean): void;

  // Save data ------------------------------------------------------------

  /** Returns the current in-memory save buffer, or null if none exists. */
  getSave(): Uint8Array | null;

  saveState(slot: number): boolean;
  loadState(slot: number): boolean;

  /** The save file path mGBA is actually using (set after loadGame). */
  saveName?: string;

  /** The auto-save state path for the current game (set after loadGame). */
  autoSaveStateName?: string;

  /** The ROM path of the currently loaded game. */
  gameName?: string;

  /** Returns common filesystem path strings used by this build. */
  filePaths(): { root: string; gamePath: string; savePath: string };

  /**
   * Uploads a save or save-state file into the VFS and triggers an internal
   * reload so mGBA picks up the new data immediately (no quitGame needed).
   */
  uploadSaveOrSaveState(file: File, callback?: () => void): void;

  /**
   * Applies core settings at runtime.
   */
  setCoreSettings(settings: {
    restoreAutoSaveStateOnLoad?: boolean;
    [key: string]: unknown;
  }): void;

  /**
   * Registers callbacks for emulator lifecycle events.
   * saveDataUpdatedCallback fires when mGBA writes the save chip to the VFS.
   */
  addCoreCallbacks(callbacks: {
    saveDataUpdatedCallback?: (() => void) | null;
    [key: string]: unknown;
  }): void;

  // Audio ----------------------------------------------------------------

  setVolume(percent: number): void;
  getVolume(): number;

  // Emscripten FS --------------------------------------------------------

  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
    readdir(path: string): string[];
    mkdir(path: string): void;
  };
}

// ---------------------------------------------------------------------------
// Factory function type
// ---------------------------------------------------------------------------

/**
 * Shape of the default export from `@thenick775/mgba-wasm`.
 * Called as `await mGBA({ canvas })` to obtain a live MgbaModule.
 */
export type MgbaFactory = (options: {
  canvas: HTMLCanvasElement;
}) => Promise<MgbaModule>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives the VFS paths for a ROM file and its associated save file.
 *
 * @param romFileName - The original file name including extension,
 *   e.g. `"pokemon_emerald.gba"`.
 * @returns An object with:
 *   - `romPath`  — absolute VFS path for the ROM
 *   - `savePath` — absolute VFS path for the `.sav` file
 *   - `saveName` — bare save file name (no directory), e.g. `"pokemon_emerald.sav"`
 *
 * @example
 * deriveFileNames('pokemon_emerald.gba')
 * // => {
 * //   romPath:  '/data/games/pokemon_emerald.gba',
 * //   savePath: '/data/saves/pokemon_emerald.sav',
 * //   saveName: 'pokemon_emerald.sav',
 * // }
 */
export function deriveFileNames(romFileName: string): {
  romPath: string;
  savePath: string;
  saveName: string;
} {
  const baseName = romFileName.replace(/\.(gba|gbc|gb)$/i, "");
  return {
    romPath: `${MGBA_PATHS.GAMES}/${romFileName}`,
    savePath: `${MGBA_PATHS.SAVES}/${baseName}.sav`,
    saveName: `${baseName}.sav`,
  };
}

/**
 * Reads a browser File object into a Uint8Array.
 * Wraps the FileReader API in a Promise for use with async/await.
 */
export function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("FileReader did not return an ArrayBuffer"));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader error"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Attempts to create a VFS directory, silently ignoring errors that indicate
 * the directory already exists (errno 44 / EEXIST in Emscripten).
 */
export function ensureVfsDirectory(fs: MgbaModule["FS"], path: string): void {
  try {
    fs.mkdir(path);
  } catch {
    // Directory likely already exists — not a fatal condition.
  }
}
