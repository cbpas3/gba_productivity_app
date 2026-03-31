import { forwardRef } from 'react';
import { useEmulatorStore } from '../../store/emulatorStore';

export const EmulatorCanvas = forwardRef<HTMLCanvasElement>((_, ref) => {
  const romLoaded = useEmulatorStore((s) => s.romLoaded);
  const status    = useEmulatorStore((s) => s.status);
  const gameName  = useEmulatorStore((s) => s.gameName);

  return (
    <div className="emulator-canvas">
      <div className="emulator-canvas__screen-wrap">
        <canvas
          ref={ref}
          id="emulator-canvas"
          width={240}
          height={160}
          className="emulator-canvas__canvas"
          aria-label={gameName ? `Playing: ${gameName}` : 'GBA emulator screen'}
        />

        {!romLoaded && (
          <div className="emulator-canvas__placeholder" aria-live="polite">
            <div className="emulator-canvas__placeholder-inner">
              <div className="emulator-canvas__logo">GBA</div>
              <div className="emulator-canvas__scanline-deco" />
              <p className="emulator-canvas__load-text">LOAD A ROM TO BEGIN</p>
              <p className="emulator-canvas__sub-text">
                {status === 'loading' ? 'INITIALISING...' : '[ SELECT .GBA FILE BELOW ]'}
              </p>
              <div className="emulator-canvas__blink-cursor">_</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .emulator-canvas {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }

        .emulator-canvas__screen-wrap {
          position: relative;
          width: 480px;
          height: 320px;
          background: #000;
          border: 3px solid var(--color-border-bright);
          border-radius: var(--radius-sm);
          box-shadow:
            var(--shadow-purple-md),
            inset 0 0 24px rgba(0,0,0,0.8),
            0 0 0 6px var(--color-surface-card),
            0 0 0 8px var(--color-border-subtle);
          overflow: hidden;
          flex-shrink: 0;
        }

        .emulator-canvas__canvas {
          display: block;
          width: 480px;
          height: 320px;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }

        .emulator-canvas__placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(0,229,255,0.03) 3px,
              rgba(0,229,255,0.03) 4px
            ),
            radial-gradient(ellipse at center, #0d0030 0%, #000 100%);
        }

        .emulator-canvas__placeholder-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
        }

        .emulator-canvas__logo {
          font-family: var(--font-pixel);
          font-size: 2.5rem;
          color: var(--color-purple-glow);
          text-shadow:
            0 0 20px rgba(206, 147, 216, 0.9),
            0 0 40px rgba(206, 147, 216, 0.5),
            0 0 80px rgba(123, 31, 162, 0.4);
          letter-spacing: 0.2em;
          line-height: 1;
        }

        .emulator-canvas__scanline-deco {
          width: 120px;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--color-accent-cyan) 30%,
            var(--color-purple-glow) 50%,
            var(--color-accent-cyan) 70%,
            transparent 100%
          );
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
        }

        .emulator-canvas__load-text {
          font-family: var(--font-pixel);
          font-size: 0.65rem;
          color: var(--color-accent-cyan);
          text-shadow: var(--glow-text-cyan);
          letter-spacing: 0.12em;
          text-align: center;
        }

        .emulator-canvas__sub-text {
          font-family: var(--font-retro);
          font-size: 1.1rem;
          color: var(--color-text-muted);
          letter-spacing: 0.08em;
          text-align: center;
        }

        .emulator-canvas__blink-cursor {
          font-family: var(--font-pixel);
          font-size: 0.7rem;
          color: var(--color-accent-cyan);
          animation: blink 1s step-end infinite;
        }

        @media (max-width: 768px) {
          .emulator-canvas {
            width: 100%;
          }
          .emulator-canvas__screen-wrap,
          .emulator-canvas__canvas {
            width: 100%;
            height: auto;
            aspect-ratio: 3 / 2;
          }
        }
      `}</style>
    </div>
  );
});

EmulatorCanvas.displayName = 'EmulatorCanvas';
