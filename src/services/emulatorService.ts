/**
 * EmulatorService — main thread mGBA-WASM integration.
 *
 * Implements IEmulatorService from src/types/emulator.ts.
 *
 * Lifecycle:
 *   1. Call initialize(canvas) once. This checks cross-origin isolation,
 *      dynamically imports @thenick775/mgba-wasm, creates the module, mounts
 *      the VFS, and creates the required directory structure.
 *   2. Call loadRom(file) to write the ROM into the VFS and start emulation.
 *   3. Optionally call loadSave(file) to inject a .sav file before or after
 *      loading a ROM.
 *   4. Use pressButton / releaseButton for input passthrough.
 *   5. Use getCurrentSave / writeSaveAndReload for save-data manipulation.
 */

import type {
  IEmulatorService,
  EmulatorStatus,
  GbaButton,
} from "../types/emulator";
import type { MgbaModule, MgbaFactory } from "./mgbaAdapter";
import {
  MGBA_PATHS,
  deriveFileNames,
  readFileAsUint8Array,
  ensureVfsDirectory,
} from "./mgbaAdapter";
import { assertCrossOriginIsolated } from "../utils/crossOriginCheck";

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class EmulatorServiceImpl implements IEmulatorService {
  // Internals -----------------------------------------------------------

  private module: MgbaModule | null = null;
  private initializing: boolean = false;
  private status: EmulatorStatus = "idle";
  private currentRomPath: string | null = null;
  private currentSavePath: string | null = null;
  private currentRomData: Uint8Array | null = null;
  private saveCallback: (() => void) | null = null;
  private stagedSaveData: Uint8Array | null = null;

  // IEmulatorService — initialize ---------------------------------------

  /**
   * Prepares the emulator for use.
   *
   * Steps:
   *   1. Assert cross-origin isolation (required for SharedArrayBuffer).
   *   2. Dynamically import the mGBA WASM package.
   *   3. Instantiate the module bound to the provided canvas.
   *   4. Call FSInit() to mount the persistent VFS.
   *   5. Create the /data/games and /data/saves directories if absent.
   *
   * @throws {Error} When cross-origin isolation is missing or mGBA fails
   *   to initialise.
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.module !== null || this.initializing) {
      // Already initialised or a concurrent initialisation is in flight.
      return;
    }

    this.initializing = true;
    this.setStatus("loading");

    try {
      assertCrossOriginIsolated();

      // Dynamic import keeps the heavy WASM bundle out of the initial chunk.
      const mgbaModule = await import("@thenick775/mgba-wasm");
      const mGBA = mgbaModule.default as MgbaFactory;

      this.module = await mGBA({ canvas });
      await this.module.FSInit();

      // Ensure VFS directory structure exists.
      ensureVfsDirectory(this.module.FS, "/data");
      ensureVfsDirectory(this.module.FS, MGBA_PATHS.GAMES);
      ensureVfsDirectory(this.module.FS, MGBA_PATHS.SAVES);

      this.initializing = false;
      this.setStatus("idle");
    } catch (err) {
      this.initializing = false;
      this.setStatus("error");
      // Re-throw so the caller (typically a React component) can surface the
      // error to the user.
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  // IEmulatorService — ROM / save loading --------------------------------

  /**
   * Writes a ROM file to the VFS and starts emulation.
   *
   * @returns true when mGBA accepted the ROM, false when it was rejected
   *   (unsupported format, corrupt header, etc.).
   */
  async loadRom(file: File): Promise<boolean> {
    this.requireModule();
    this.setStatus("loading");

    try {
      const { romPath, savePath } = deriveFileNames(file.name);

      const romData = await readFileAsUint8Array(file);

      // Write ROM into the virtual filesystem.
      this.module!.FS.writeFile(romPath, romData);

      // Pre-write staged cloud save BEFORE loadGame so mGBA reads it directly
      // into the C heap save chip. Writing after loadGame + quickReload() does
      // not work because quickReload() is a CPU-only reset that never re-reads
      // VFS — the old save chip contents survive unchanged.
      if (this.stagedSaveData !== null) {
        try {
          this.module!.FS.writeFile(savePath, this.stagedSaveData);
          console.log("[EmulatorService] Staged save pre-written to VFS.");
        } catch (e) {
          console.warn("[EmulatorService] Failed to pre-write staged save:", e);
        }
        this.stagedSaveData = null;
      }

      const accepted = this.module!.loadGame(romPath);

      if (!accepted) {
        // mGBA rejected the file — remove it from the VFS to keep things tidy.
        this.safeUnlink(romPath);
        this.setStatus("error");
        return false;
      }

      // Persist paths for subsequent save operations.
      this.currentRomPath = romPath;
      this.currentRomData = romData;

      // Use the actual save path mGBA chose (may differ from our derivation).
      this.currentSavePath = this.module!.saveName ?? savePath;
      console.log(
        "[EmulatorService] ROM loaded. savePath =",
        this.currentSavePath,
      );

      // Register the save-write callback so cloud upload triggers on every flush.
      if (this.saveCallback !== null) {
        this.module!.addCoreCallbacks({ saveDataUpdatedCallback: this.saveCallback });
      }

      this.setStatus("running");
      return true;
    } catch (err) {
      this.setStatus("error");
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Writes a .sav file into the VFS and triggers a quick reload so that mGBA
   * picks up the new save data without having to restart the ROM.
   *
   * Can be called before or after loadRom. When called before loadRom, the
   * save data will be present on the VFS when the game loads.
   */
  async loadSave(file: File): Promise<void> {
    this.requireModule();

    if (this.currentSavePath === null) {
      // Derive save path from the save file's own name so callers can inject
      // a save even before a ROM is loaded.
      const { savePath } = deriveFileNames(file.name);
      const saveData = await readFileAsUint8Array(file);
      this.module!.FS.writeFile(savePath, saveData);
      // Cannot quickReload without a loaded game — the data is staged for when
      // the ROM is eventually loaded.
      return;
    }

    try {
      const saveData = await readFileAsUint8Array(file);
      this.module!.FS.writeFile(this.currentSavePath, saveData);
      this.module!.quickReload();
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  // IEmulatorService — save data access ----------------------------------

  /**
   * Returns the current save data buffer from mGBA, or null when no game is
   * loaded or no save data exists yet.
   *
   * First tries mGBA's `getCurrentSave()` (fastest — no VFS round trip).
   * Falls back to reading from the VFS save path on failure.
   */
  getCurrentSave(): Uint8Array | null {
    if (this.module === null) return null;

    // Prefer the in-memory buffer exposed directly by mGBA.
    try {
      const fromModule = this.module.getSave();
      if (fromModule !== null && fromModule.byteLength > 0) {
        // Return a copy so the caller cannot mutate mGBA's internal buffer.
        return new Uint8Array(fromModule);
      }
    } catch {
      // Fall through to VFS read.
    }

    // Secondary fallback: read the .sav file from the VFS.
    if (this.currentSavePath !== null) {
      try {
        const fromFs = this.module.FS.readFile(this.currentSavePath);
        if (fromFs.byteLength > 0) {
          return new Uint8Array(fromFs);
        }
      } catch {
        // No save on VFS yet — return null.
      }
    }

    return null;
  }

  /**
   * Writes modified save data to the VFS and reloads the game so that mGBA
   * uses the new data immediately.
   *
   * Primary path: write + quickReload().
   * Fallback path: write + quitGame() + loadGame() when quickReload fails.
   */
  async writeSaveAndReload(saveData: Uint8Array): Promise<void> {
    this.requireModule();

    if (this.currentSavePath === null || this.currentRomPath === null) {
      throw new Error(
        "No ROM loaded. Cannot write save data without an active game.",
      );
    }

    const savePath = this.currentSavePath;
    const romPath = this.currentRomPath;

    console.log(
      "[EmulatorService] writeSaveAndReload: START injecting",
      saveData.byteLength,
      "bytes →",
      savePath,
    );

    // 1. Disable auto-save-state restore.
    try {
      this.module!.setCoreSettings({ restoreAutoSaveStateOnLoad: false });
      console.log("[EmulatorService] step 1: setCoreSettings OK");
    } catch (e) {
      console.warn("[EmulatorService] step 1: setCoreSettings failed", e);
    }

    // 2. Write our save BEFORE quitGame (critical — must succeed).
    this.module!.FS.writeFile(savePath, saveData);
    console.log("[EmulatorService] step 2: FS.writeFile (pre-quit) OK");

    // 3. Disable DOM input to prevent focusEventHandlerFunc crash.
    try {
      this.module!.toggleInput(false);
      console.log("[EmulatorService] step 3: toggleInput(false) OK");
    } catch (e) {
      console.warn("[EmulatorService] step 3: toggleInput failed", e);
    }

    // 4. quitGame.
    try {
      this.module!.quitGame();
      console.log("[EmulatorService] step 4: quitGame() OK");
    } catch (e) {
      console.error("[EmulatorService] step 4: quitGame() FAILED", e);
    }

    // 5. Wait for WASM worker thread to finish save flush.
    console.log("[EmulatorService] step 5: waiting 1000ms for flush...");
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    console.log("[EmulatorService] step 5: wait complete");

    // 6. Write our save AGAIN — guaranteed after any async flush (critical).
    this.module!.FS.writeFile(savePath, saveData);
    console.log("[EmulatorService] step 6: FS.writeFile (post-flush) OK");

    // 7. Re-stage ROM (critical — loadGame needs the ROM on VFS).
    if (this.currentRomData !== null) {
      this.module!.FS.writeFile(romPath, this.currentRomData);
      console.log("[EmulatorService] step 7: ROM re-staged OK");
    }

    // 8. Delete auto-save state snapshot.
    const autoSavePath = this.module!.autoSaveStateName;
    if (autoSavePath) {
      try {
        this.module!.FS.unlink(autoSavePath);
        console.log(
          "[EmulatorService] step 8: deleted .ss snapshot",
          autoSavePath,
        );
      } catch {
        /* file may not exist */
      }
    }
    try {
      this.module!.setCoreSettings({ autoSaveStateEnable: false });
      console.log("[EmulatorService] step 8b: autoSaveStateEnable=false OK");
    } catch (e) {
      console.warn("[EmulatorService] step 8b: setCoreSettings failed", e);
    }

    // 9. Cold-reload the ROM.
    try {
      const accepted = this.module!.loadGame(romPath, savePath);
      console.log("[EmulatorService] step 9: loadGame() →", accepted);
      if (!accepted) {
        this.setStatus("error");
        throw new Error(
          "mGBA rejected the ROM during reload after save injection.",
        );
      }
    } catch (e) {
      console.error("[EmulatorService] step 9: loadGame() FAILED", e);
      this.setStatus("error");
      try {
        this.module!.toggleInput(true);
      } catch {
        /* restore input */
      }
      throw e;
    }

    // 10. Re-enable input.
    try {
      this.module!.toggleInput(true);
      console.log("[EmulatorService] step 10: toggleInput(true) OK");
    } catch (e) {
      console.warn("[EmulatorService] step 10: toggleInput failed", e);
    }

    // 11. Re-enable auto-save-state.
    try {
      this.module!.setCoreSettings({
        restoreAutoSaveStateOnLoad: true,
        autoSaveStateEnable: true,
      });
      console.log("[EmulatorService] step 11: auto-save re-enabled OK");
    } catch (e) {
      console.warn("[EmulatorService] step 11: setCoreSettings failed", e);
    }

    // 12. Persist to IndexedDB.
    try {
      this.module!.FS.writeFile(savePath, saveData);
      await this.module!.FSSync();
      console.log("[EmulatorService] step 12: FSSync OK");
    } catch (e) {
      console.warn("[EmulatorService] step 12: FSSync failed", e);
    }

    // 13. Re-register the save callback — loadGame() clears core callbacks,
    //     so without this step in-game saves after a writeSaveAndReload would
    //     never trigger the cloud upload debounce.
    if (this.saveCallback !== null) {
      try {
        this.module!.addCoreCallbacks({ saveDataUpdatedCallback: this.saveCallback });
        console.log("[EmulatorService] step 13: save callback re-registered OK");
      } catch (e) {
        console.warn("[EmulatorService] step 13: addCoreCallbacks failed", e);
      }
    }

    console.log("[EmulatorService] writeSaveAndReload: COMPLETE");
    this.setStatus("running");
  }

  // IEmulatorService — playback control ----------------------------------

  /**
   * Pauses the running game using mGBA's native pauseGame().
   * Calling pause() when not running is a no-op.
   */
  pause(): void {
    if (this.module === null || this.status !== "running") return;

    try {
      this.module.pauseGame();
      this.setStatus("paused");
    } catch {
      this.setStatus("paused");
    }
  }

  /**
   * Resumes a paused game using mGBA's native resumeGame().
   * Calling resume() when not paused is a no-op.
   */
  async resume(): Promise<void> {
    if (this.module === null || this.status !== "paused") return;

    try {
      this.module.resumeGame();
      this.setStatus("running");
    } catch (err) {
      this.setStatus("error");
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  // IEmulatorService — input ---------------------------------------------

  /**
   * Simulates pressing a GBA button.
   * GbaButton string values match mGBA's expected button name strings exactly,
   * so no translation is required.
   */
  pressButton(button: GbaButton): void {
    if (this.module === null || this.status !== "running") return;
    try {
      this.module.buttonPress(button);
    } catch {
      // Input errors are non-fatal.
    }
  }

  /**
   * Releases a previously pressed button.
   */
  releaseButton(button: GbaButton): void {
    if (this.module === null || this.status !== "running") return;
    try {
      this.module.buttonUnpress(button);
    } catch {
      // Input errors are non-fatal.
    }
  }

  /**
   * Enables or disables mGBA's internal SDL2 keyboard handling.
   * Call with false when a text input is focused to prevent key stealing.
   */
  toggleInput(enabled: boolean): void {
    if (this.module === null) return;
    try {
      this.module.toggleInput(enabled);
    } catch {
      // Non-fatal.
    }
  }

  // IEmulatorService — restart -------------------------------------------

  /**
   * Simulates pressing the hardware Reset button on the GBA.
   *
   * A true hardware reset boots the game cold from the title screen — no save
   * state is restored. mGBA's default quickReload() behaviour restores the
   * auto-save snapshot (.ss file), which is an emulator-only concept that
   * does not exist on real hardware.
   *
   * To suppress that we:
   *   1. Disable restoreAutoSaveStateOnLoad so quickReload ignores snapshots.
   *   2. Delete the .ss snapshot file so there is nothing to restore even if
   *      the setting were re-enabled mid-reset.
   *   3. Call quickReload() — CPU/GPU soft-reset, save chip (SRAM/Flash/EEPROM)
   *      stays in C heap, matching real hardware where the chip is battery-backed.
   *   4. Re-enable restoreAutoSaveStateOnLoad for normal emulator operation.
   *
   * No-op when no game is loaded.
   */
  restart(): void {
    if (this.module === null || this.status !== 'running') return;
    try {
      this.module.setCoreSettings({ restoreAutoSaveStateOnLoad: false });

      const ssPath = this.module.autoSaveStateName;
      if (ssPath) {
        try { this.module.FS.unlink(ssPath); } catch { /* snapshot may not exist yet */ }
      }

      this.module.quickReload();

      this.module.setCoreSettings({ restoreAutoSaveStateOnLoad: true });
    } catch {
      // Non-fatal — partial failure leaves the game running.
    }
  }

  // IEmulatorService — speed control --------------------------------------

  /**
   * Enables or disables fast-forward (2x speed).
   * Tries multiple mGBA APIs for broad compatibility.
   */
  setFastForward(enabled: boolean): void {
    if (this.module === null) return;
    try {
      if (typeof this.module.setFastForwardMultiplier === 'function') {
        this.module.setFastForwardMultiplier(enabled ? 2 : 1);
      } else if (typeof this.module.setFastForwardRatio === 'function') {
        this.module.setFastForwardRatio(enabled ? 2.0 : 1.0);
      } else {
        this.module.setCoreSettings({ fastForwardMultiplier: enabled ? 2 : 1 });
      }
    } catch {
      // Non-fatal — speed control not available on this build.
    }
  }

  // IEmulatorService — status --------------------------------------------

  /** Returns the current emulator status. */
  getStatus(): EmulatorStatus {
    return this.status;
  }

  // IEmulatorService — cloud save sync -----------------------------------

  /**
   * Register a callback that fires whenever mGBA flushes save data to the VFS.
   * Re-registers with the live module immediately if a game is already loaded.
   * Pass null to unregister.
   */
  setSaveCallback(cb: (() => void) | null): void {
    this.saveCallback = cb;
    if (this.module !== null) {
      this.module.addCoreCallbacks({ saveDataUpdatedCallback: cb ?? undefined });
    }
  }

  /**
   * Stage save data to be injected into the VFS right after the next loadRom
   * succeeds. The staged data is consumed (cleared) after injection.
   */
  stageSaveForNextLoad(data: Uint8Array): void {
    this.stagedSaveData = data;
  }

  // Private helpers ------------------------------------------------------

  /**
   * Throws if the mGBA module has not been initialised yet.
   * Provides a clear error message rather than a null-dereference crash.
   */
  private requireModule(): void {
    if (this.module === null) {
      throw new Error(
        "EmulatorService has not been initialised. Call initialize(canvas) first.",
      );
    }
  }

  /**
   * Updates the internal status field.
   * Centralised so future observers (e.g. event bus) can be added here.
   */
  private setStatus(next: EmulatorStatus): void {
    this.status = next;
  }

  /**
   * Attempts to remove a file from the VFS, silently ignoring errors
   * (e.g. file did not exist).
   */
  private safeUnlink(path: string): void {
    try {
      this.module?.FS.unlink(path);
    } catch {
      // Removal failure is not fatal.
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * Application-wide singleton instance of the emulator service.
 *
 * Import this object anywhere in the app that needs emulator access.
 * Call `emulatorService.initialize(canvas)` once from the component that
 * owns the <canvas> element.
 */
export const emulatorService: IEmulatorService = new EmulatorServiceImpl();
