import { useRef, useEffect, useCallback } from "react";
import { Header } from "./Header";
import { TutorialModal } from "../TutorialModal";
import { TaskForm, TaskList, TaskBoardModal, BulkImportModal } from "../TaskManager";
import { RewardDisplay } from "../RewardPanel";
import { EmulatorCanvas, GbaControls, RomLoader } from "../EmulatorView";
import { emulatorService } from "../../services/emulatorService";
import { useEmulatorStore } from "../../store/emulatorStore";
import { useTaskStore } from "../../store/taskStore";

export function AppLayout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emulatorWrapRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const setStatus = useEmulatorStore((s) => s.setStatus);
  const setError = useEmulatorStore((s) => s.setError);
  const errorMessage = useEmulatorStore((s) => s.errorMessage);
  const resetRecurringTasks = useTaskStore((s) => s.resetRecurringTasks);

  const isFastForward = useEmulatorStore((s) => s.isFastForward);
  const toggleFastForward = useEmulatorStore((s) => s.toggleFastForward);
  const isFullscreen = useEmulatorStore((s) => s.isFullscreen);
  const setIsFullscreen = useEmulatorStore((s) => s.setIsFullscreen);

  const initEmulator = useCallback(() => {
    if (!canvasRef.current) return;

    setStatus("loading");

    emulatorService
      .initialize(canvasRef.current)
      .then(() => {
        initialized.current = true;
        setStatus("idle");
        // Re-apply persisted fast-forward state to the freshly ready module.
        // The isFastForward effect fires at mount before the module exists, so
        // the correct speed must be set here after a successful initialisation
        // (and after any RETRY).
        emulatorService.setFastForward(useEmulatorStore.getState().isFastForward);
      })
      .catch((err: unknown) => {
        initialized.current = false;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      });
  }, [setStatus, setError]);

  useEffect(() => {
    if (initialized.current) return;
    // Set the flag synchronously before the async call so that React StrictMode's
    // double-invocation of effects (dev only) cannot race and create a second
    // mGBA instance. Without this, both invocations see initialized.current===false
    // and each creates an SDL2 module; the orphaned first module keeps its keyboard
    // listeners active, blocking text input even after toggleInput(false) is called
    // on the second (active) module.
    initialized.current = true;
    initEmulator();
  }, [initEmulator]);

  // Handle recurring quest un-checking bounds
  useEffect(() => {
    resetRecurringTasks();
    const handleFocus = () => resetRecurringTasks();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [resetRecurringTasks]);

  // Sync fast-forward state with service
  useEffect(() => {
    emulatorService.setFastForward(isFastForward);
  }, [isFastForward]);

  // Track fullscreen changes from browser chrome (Escape key, etc.)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, [setIsFullscreen]);

  const handleToggleFullscreen = useCallback(async () => {
    if (!emulatorWrapRef.current) return;

    // iOS Safari and some PWA environments don't support the Fullscreen API.
    // Fall back to simulated fullscreen via position:fixed controlled by store state.
    if (!document.fullscreenEnabled) {
      const next = !isFullscreen;
      setIsFullscreen(next);
      if (next) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch { /* not supported or not allowed */ }
      }
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await emulatorWrapRef.current.requestFullscreen();
        // Attempt landscape lock on mobile
        try {
          await (screen.orientation as any).lock('landscape');
        } catch { /* not supported or not allowed */ }
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // If the promise rejects no fullscreenchange event fires, so force-sync
      // the store from the actual browser state to prevent a permanent mismatch
      // where the button shows "EXIT FS" but the browser is not in fullscreen.
      setIsFullscreen(!!document.fullscreenElement);
    }
  }, [setIsFullscreen, isFullscreen]);

  return (
    <div className="app-layout">
      <Header />

      <main className="app-layout__main" role="main">
        {/* ── Left panel: Tasks + Rewards ── */}
        <aside
          className="app-layout__left-panel"
          aria-label="Quest and reward management"
        >
          <section
            className="app-layout__section card pixel-border"
            aria-label="Quest manager"
          >
            <h2 className="app-layout__section-title glow-text--cyan">
              QUEST LOG
            </h2>
            <hr className="pixel-divider" />
            <TaskForm />
            <hr className="pixel-divider" />
            <TaskList />
          </section>

          <section
            className="app-layout__section card pixel-border"
            aria-label="Reward center"
          >
            <h2 className="app-layout__section-title glow-text--purple">
              REWARD CENTER
            </h2>
            <hr className="pixel-divider" />
            <RewardDisplay />
          </section>
        </aside>

        {/* ── Right panel: Emulator ── */}
        <section className="app-layout__right-panel" aria-label="Game emulator">
          <div className="app-layout__emulator-wrap card pixel-border">
            <h2 className="app-layout__section-title glow-text--purple">
              EMULATOR
            </h2>
            <hr className="pixel-divider" />

            <div ref={emulatorWrapRef} className={`app-layout__emulator-inner ${isFullscreen ? 'is-fullscreen' : ''}`}>
              <EmulatorCanvas ref={canvasRef} />
              {errorMessage && (
                <div className="app-layout__emu-error">
                  <p className="app-layout__emu-error-msg">{errorMessage}</p>
                  <button
                    className="btn btn--danger"
                    onClick={() => {
                      initialized.current = false;
                      initEmulator();
                    }}
                  >
                    RETRY
                  </button>
                </div>
              )}

              {/* Emulator Toolbar */}
              <div className="emu-toolbar">
                <button
                  className={`btn emu-toolbar__btn ${isFastForward ? 'emu-toolbar__btn--active' : ''}`}
                  onClick={toggleFastForward}
                  title={isFastForward ? 'Normal Speed (1x)' : 'Fast Forward (2x)'}
                >
                  {isFastForward ? '⏩ 2x' : '▶ 1x'}
                </button>
                <button
                  className={`btn emu-toolbar__btn ${isFullscreen ? 'emu-toolbar__btn--active' : ''}`}
                  onClick={handleToggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? '✖ EXIT FS' : '🔲 FULLSCREEN'}
                </button>
              </div>

              <GbaControls />
              <RomLoader />
            </div>
          </div>
        </section>
      </main>

      <footer className="app-layout__footer" role="contentinfo">
        <p className="app-layout__footer-text">
          Emulation powered by{" "}
          <a
            href="https://mgba.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="app-layout__footer-link"
          >
            mGBA
          </a>{" "}
          (Mozilla Public License 2.0) via{" "}
          <a
            href="https://github.com/thenick775/mgba-wasm"
            target="_blank"
            rel="noopener noreferrer"
            className="app-layout__footer-link"
          >
            mgba-wasm
          </a>
          . Fonts: Press Start 2P by Christian Robertson &amp; VT323 by Peter
          Hull (SIL Open Font License 1.1). Game Boy Advance is a trademark of
          Nintendo Co., Ltd. This app is not affiliated with or endorsed by
          Nintendo.
        </p>
      </footer>

      <TutorialModal />
      <TaskBoardModal />
      <BulkImportModal />

      <style>{`
        .app-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .app-layout__main {
          display: flex;
          flex: 1;
          gap: var(--space-4);
          padding: var(--space-4);
          align-items: flex-start;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        /* ── Left panel ── */
        .app-layout__left-panel {
          flex: 0 0 40%;
          max-width: 40%;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          overflow-y: auto;
          max-height: calc(100vh - 120px);
          padding-right: var(--space-1);
        }

        .app-layout__section {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .app-layout__section-title {
          font-family: var(--font-pixel);
          font-size: 0.6rem;
          letter-spacing: 0.15em;
        }

        /* ── Right panel ── */
        .app-layout__right-panel {
          flex: 0 0 60%;
          max-width: 60%;
        }

        .app-layout__emulator-wrap {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .app-layout__emulator-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .app-layout__emu-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-sm);
          width: 100%;
          box-sizing: border-box;
        }
        .app-layout__emu-error-msg {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-accent-red, #ef4444);
          text-align: center;
          line-height: 1.6;
          word-break: break-word;
        }

        /* ── Emulator Toolbar ── */
        .emu-toolbar {
          display: flex;
          gap: var(--space-2);
          width: 100%;
          justify-content: center;
        }
        .emu-toolbar__btn {
          font-family: var(--font-pixel);
          font-size: 0.45rem;
          padding: var(--space-2) var(--space-3);
          background: var(--color-surface-body);
          border: 1px solid var(--color-border-subtle);
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
          border-radius: var(--radius-sm);
        }
        .emu-toolbar__btn:hover {
          border-color: var(--color-border-bright);
          color: var(--color-text-primary);
        }
        .emu-toolbar__btn--active {
          background: var(--color-purple-dark);
          border-color: var(--color-purple-glow);
          color: var(--color-accent-cyan);
          box-shadow: var(--shadow-cyan-sm);
        }

        /* ── Fullscreen mode ── */
        /* Simulated fullscreen (iOS / browsers without Fullscreen API):
           uses position:fixed so the element covers the viewport in normal flow. */
        .app-layout__emulator-inner.is-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          overflow: hidden;
        }
        /* Native fullscreen: browser controls sizing, position:relative is correct.
           Defined after .is-fullscreen so it wins when both selectors match
           (native fullscreen also sets the is-fullscreen class via fullscreenchange). */
        .app-layout__emulator-inner:fullscreen,
        .app-layout__emulator-inner:-webkit-full-screen {
          position: relative;
          background: #000;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        /* Override EmulatorCanvas hardcoded 480×320 sizing */
        .app-layout__emulator-inner.is-fullscreen .emulator-canvas {
          width: 100% !important;
          height: 100% !important;
        }
        .app-layout__emulator-inner.is-fullscreen .emulator-canvas__screen-wrap {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .app-layout__emulator-inner.is-fullscreen .emulator-canvas__canvas {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain;
          image-rendering: pixelated;
        }
        .app-layout__emulator-inner.is-fullscreen .emulator-canvas__placeholder {
          display: none;
        }
        .app-layout__emulator-inner.is-fullscreen .emu-toolbar {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
          z-index: 100;
          width: auto;
        }
        /* Desktop fullscreen: hide on-screen controller — keyboard is available */
        @media (min-width: 769px) {
          .app-layout__emulator-inner.is-fullscreen .gba-controls {
            display: none;
          }
        }

        /* Mobile fullscreen: transparent ghost controls spread across the bottom */
        @media (max-width: 768px) {
          .app-layout__emulator-inner.is-fullscreen .gba-controls {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 100;
            background: transparent;
            backdrop-filter: none;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0;
            padding: var(--space-3) var(--space-4);
          }
          /* Always use spread layout in fullscreen regardless of one-handed setting */
          .app-layout__emulator-inner.is-fullscreen .gba-controls__body {
            justify-content: space-between !important;
          }
          /* Hide the one-handed toggle — irrelevant in landscape fullscreen */
          .app-layout__emulator-inner.is-fullscreen .gba-controls__alignment-toggle {
            display: none !important;
          }
          /* Ghost-out all interactive elements so the game shows through */
          .app-layout__emulator-inner.is-fullscreen .gba-controls__dpad-btn,
          .app-layout__emulator-inner.is-fullscreen .gba-controls__dpad-center,
          .app-layout__emulator-inner.is-fullscreen .gba-controls__action,
          .app-layout__emulator-inner.is-fullscreen .gba-controls__shoulder,
          .app-layout__emulator-inner.is-fullscreen .gba-controls__pill {
            opacity: 0.35;
          }
          /* Briefly brighten on press so there's tactile feedback */
          .app-layout__emulator-inner.is-fullscreen .gba-controls__dpad-btn:active,
          .app-layout__emulator-inner.is-fullscreen .gba-controls__action:active,
          .app-layout__emulator-inner.is-fullscreen .gba-controls__shoulder:active,
          .app-layout__emulator-inner.is-fullscreen .gba-controls__pill:active {
            opacity: 0.9;
          }
        }
        .app-layout__emulator-inner.is-fullscreen .rom-loader {
          display: none;
        }
        .app-layout__emulator-inner.is-fullscreen .app-layout__emu-error {
          display: none;
        }

        /* ── Footer ── */
        .app-layout__footer {
          padding: var(--space-3) var(--space-5);
          border-top: 1px solid rgba(123, 31, 162, 0.3);
          text-align: center;
        }

        .app-layout__footer-text {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-text-muted);
          opacity: 0.5;
          letter-spacing: 0.06em;
          line-height: 2;
        }

        .app-layout__footer-link {
          color: var(--color-accent-cyan);
          text-decoration: none;
          opacity: 0.8;
        }

        .app-layout__footer-link:hover {
          opacity: 1;
          text-decoration: underline;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .app-layout__main {
            flex-direction: column;
            padding: var(--space-1);
            gap: var(--space-2);
            max-height: none;
          }

          .app-layout__emulator-wrap.card {
            padding: var(--space-2);
          }

          .app-layout__right-panel {
            flex: none;
            max-width: 100%;
            width: 100%;
            order: -1; /* Move emulator to the top */
          }

          .app-layout__left-panel {
            flex: none;
            max-width: 100%;
            width: 100%;
            max-height: none;
            overflow-y: visible;
            padding-right: 0;
          }
        }
      `}</style>
    </div>
  );
}
