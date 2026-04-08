import { useRef, useEffect, useCallback, useState } from 'react';
import { EmulatorCanvas, GbaControls, RomLoader } from '../EmulatorView';
import { RewardDisplay } from '../RewardPanel';
import { emulatorService } from '../../services/emulatorService';
import { useEmulatorStore } from '../../store/emulatorStore';

export function PlayRoom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emulatorWrapRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const setStatus = useEmulatorStore((s) => s.setStatus);
  const setError = useEmulatorStore((s) => s.setError);
  const errorMessage = useEmulatorStore((s) => s.errorMessage);
  const isFastForward = useEmulatorStore((s) => s.isFastForward);
  const toggleFastForward = useEmulatorStore((s) => s.toggleFastForward);
  const isFullscreen = useEmulatorStore((s) => s.isFullscreen);
  const setIsFullscreen = useEmulatorStore((s) => s.setIsFullscreen);

  const isTouchDevice = useRef(
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches
  );

  const initEmulator = useCallback(() => {
    if (!canvasRef.current) return;
    setStatus('loading');
    emulatorService
      .initialize(canvasRef.current)
      .then(() => {
        initialized.current = true;
        setStatus('idle');
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
    initialized.current = true;
    initEmulator();
  }, [initEmulator]);

  useEffect(() => {
    emulatorService.setFastForward(isFastForward);
  }, [isFastForward]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [setIsFullscreen]);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    if (!emulatorWrapRef.current) return;

    if (!document.fullscreenEnabled) {
      const next = !isFullscreen;
      setIsFullscreen(next);
      if (next) {
        try {
          await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock('landscape');
        } catch { /* not supported */ }
      }
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await emulatorWrapRef.current.requestFullscreen();
        try {
          await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock('landscape');
        } catch { /* not supported */ }
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen(!!document.fullscreenElement);
    }
  }, [setIsFullscreen, isFullscreen]);

  return (
    <div className="play-room">
      <div className="play-room__emulator-wrap card pixel-border">
        <h2 className="play-room__section-title glow-text--purple">EMULATOR</h2>
        <hr className="pixel-divider" />

        <div
          ref={emulatorWrapRef}
          className={`play-room__emulator-inner ${isFullscreen ? 'is-fullscreen' : ''}`}
        >
          <EmulatorCanvas ref={canvasRef} />

          {errorMessage && (
            <div className="play-room__emu-error">
              <p className="play-room__emu-error-msg">{errorMessage}</p>
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

          {isFullscreen && isTouchDevice.current && isPortrait && (
            <div className="play-room__rotate-hint" aria-live="polite" aria-label="Rotate your device for best experience">
              <span className="play-room__rotate-icon">↻</span>
              <span className="play-room__rotate-text">ROTATE DEVICE</span>
            </div>
          )}

          <GbaControls />
          <RomLoader />
        </div>
      </div>

      <section
        className="play-room__rewards card pixel-border"
        aria-label="Reward center"
      >
        <h2 className="play-room__section-title glow-text--purple">REWARD CENTER</h2>
        <hr className="pixel-divider" />
        <RewardDisplay />
      </section>

      <style>{`
        .play-room {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
          padding: var(--space-4);
          box-sizing: border-box;
        }

        .play-room__emulator-wrap {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .play-room__section-title {
          font-family: var(--font-pixel);
          font-size: 0.6rem;
          letter-spacing: 0.15em;
        }

        .play-room__emulator-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .play-room__emu-error {
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

        .play-room__emu-error-msg {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-accent-red, #ef4444);
          text-align: center;
          line-height: 1.6;
          word-break: break-word;
        }

        .play-room__rewards {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        /* ── Emulator toolbar ── */
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
        .play-room__emulator-inner.is-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          overflow: hidden;
        }

        .play-room__emulator-inner:fullscreen,
        .play-room__emulator-inner:-webkit-full-screen {
          position: relative;
          background: #000;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .play-room__emulator-inner.is-fullscreen .emulator-canvas {
          width: 100% !important;
          height: 100% !important;
        }

        .play-room__emulator-inner.is-fullscreen .emulator-canvas__screen-wrap {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        .play-room__emulator-inner.is-fullscreen .emulator-canvas__canvas {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain;
          image-rendering: pixelated;
        }

        .play-room__emulator-inner.is-fullscreen .emulator-canvas__placeholder {
          display: none;
        }

        .play-room__emulator-inner.is-fullscreen .emu-toolbar {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
          z-index: 100;
          width: auto;
        }

        /* Rotate hint */
        .play-room__rotate-hint {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 200;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          pointer-events: none;
          animation: rotate-hint-fade 1.8s ease-in-out infinite;
        }

        .play-room__rotate-icon {
          font-size: 2.5rem;
          color: rgba(255, 255, 255, 0.85);
          display: block;
          animation: rotate-spin 2s linear infinite;
        }

        .play-room__rotate-text {
          font-family: var(--font-pixel);
          font-size: 0.45rem;
          color: rgba(255, 255, 255, 0.85);
          letter-spacing: 0.12em;
          text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
        }

        @keyframes rotate-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes rotate-hint-fade {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }

        /* Touch-device fullscreen controls */
        @media (pointer: fine) {
          .play-room__emulator-inner.is-fullscreen .gba-controls {
            display: none;
          }
        }

        @media (pointer: coarse) {
          .play-room__emulator-inner.is-fullscreen .gba-controls {
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

          .play-room__emulator-inner.is-fullscreen .gba-controls__body {
            justify-content: space-between !important;
          }

          .play-room__emulator-inner.is-fullscreen .gba-controls__alignment-toggle {
            display: none !important;
          }

          .play-room__emulator-inner.is-fullscreen .gba-controls__dpad-btn,
          .play-room__emulator-inner.is-fullscreen .gba-controls__dpad-center,
          .play-room__emulator-inner.is-fullscreen .gba-controls__action,
          .play-room__emulator-inner.is-fullscreen .gba-controls__shoulder,
          .play-room__emulator-inner.is-fullscreen .gba-controls__pill {
            opacity: 0.35;
          }

          .play-room__emulator-inner.is-fullscreen .gba-controls__dpad-btn:active,
          .play-room__emulator-inner.is-fullscreen .gba-controls__action:active,
          .play-room__emulator-inner.is-fullscreen .gba-controls__shoulder:active,
          .play-room__emulator-inner.is-fullscreen .gba-controls__pill:active {
            opacity: 0.9;
          }
        }

        .play-room__emulator-inner.is-fullscreen .rom-loader {
          display: none;
        }

        .play-room__emulator-inner.is-fullscreen .play-room__emu-error {
          display: none;
        }

        @media (max-width: 768px) {
          .play-room {
            padding: var(--space-2);
            gap: var(--space-3);
          }

          .play-room__emulator-wrap.card {
            padding: var(--space-2);
          }
        }
      `}</style>
    </div>
  );
}
