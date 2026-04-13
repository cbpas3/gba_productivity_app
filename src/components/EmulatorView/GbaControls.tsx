import { useEffect, useRef } from 'react';
import { emulatorService } from '../../services/emulatorService';
import type { GbaButton } from '../../types/emulator';
import { useUiStore } from '../../store/uiStore';
import { useEmulatorStore } from '../../store/emulatorStore';

// ── Standard control button (D-pad, shoulders, Start, Select) ────────────────

interface ControlButtonProps {
  button: GbaButton;
  label: string;
  className: string;
  'aria-label': string;
}

function ControlButton({ button, label, className, 'aria-label': ariaLabel }: ControlButtonProps) {
  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    emulatorService.pressButton(button);
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.preventDefault();
    emulatorService.releaseButton(button);
  }

  function handlePointerLeave(e: React.PointerEvent) {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      emulatorService.releaseButton(button);
    }
  }

  function handlePointerCancel() {
    emulatorService.releaseButton(button);
  }

  function handleTouch(e: React.TouchEvent) {
    e.preventDefault();
  }

  function handleTouchCancel(e: React.TouchEvent) {
    e.preventDefault();
    emulatorService.releaseButton(button);
  }

  return (
    <button
      className={className}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouch}
      onTouchEnd={handleTouch}
      onTouchMove={handleTouch}
      onTouchCancel={handleTouchCancel}
      aria-label={ariaLabel}
      type="button"
    >
      {label}
    </button>
  );
}

// ── Thumbstick D-pad ─────────────────────────────────────────────────────────
//
// A single 120×120 capture zone overlaid on the cross visual. Pointer movement
// is resolved to a direction set via angle + dead-zone; buttons are pressed /
// released incrementally as the thumb slides, exactly like a thumbstick.

const DPAD_SIZE = 120;   // total bounding box (3 × 40px cells)
const DEAD_ZONE = 16;    // px from center — no directional input

type DDir = 'Up' | 'Down' | 'Left' | 'Right';

function getDirsFromOffset(dx: number, dy: number): Set<DDir> {
  const dirs = new Set<DDir>();
  if (Math.sqrt(dx * dx + dy * dy) < DEAD_ZONE) return dirs;
  // atan2: right=0°, down=90°, left=±180°, up=-90°
  const a = Math.atan2(dy, dx) * (180 / Math.PI);
  if (a > -112.5 && a <= -67.5)              dirs.add('Up');
  else if (a > -67.5 && a <= -22.5)        { dirs.add('Up');   dirs.add('Right'); }
  else if (a > -22.5 && a <=  22.5)          dirs.add('Right');
  else if (a >  22.5 && a <=  67.5)        { dirs.add('Down'); dirs.add('Right'); }
  else if (a >  67.5 && a <= 112.5)          dirs.add('Down');
  else if (a > 112.5 && a <= 157.5)        { dirs.add('Down'); dirs.add('Left');  }
  else if (a >  157.5 || a <= -157.5)        dirs.add('Left');
  else                                      { dirs.add('Up');   dirs.add('Left');  }
  return dirs;
}

function DPad() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeDirs = useRef<Set<DDir>>(new Set());
  // visual highlight state — stored in a ref and applied via direct DOM mutation
  // to avoid re-render on every pointermove
  const cellRefs = {
    Up:    useRef<HTMLDivElement>(null),
    Down:  useRef<HTMLDivElement>(null),
    Left:  useRef<HTMLDivElement>(null),
    Right: useRef<HTMLDivElement>(null),
  };

  function applyDirs(next: Set<DDir>) {
    const prev = activeDirs.current;
    // Release buttons no longer held
    for (const d of prev) {
      if (!next.has(d)) {
        emulatorService.releaseButton(d as GbaButton);
        if (cellRefs[d].current) cellRefs[d].current!.classList.remove('dpad-cell--active');
      }
    }
    // Press newly held buttons
    for (const d of next) {
      if (!prev.has(d)) {
        emulatorService.pressButton(d as GbaButton);
        if (cellRefs[d].current) cellRefs[d].current!.classList.add('dpad-cell--active');
      }
    }
    activeDirs.current = next;
  }

  function releaseAll() {
    for (const d of activeDirs.current) {
      emulatorService.releaseButton(d as GbaButton);
      if (cellRefs[d].current) cellRefs[d].current!.classList.remove('dpad-cell--active');
    }
    activeDirs.current = new Set();
  }

  function getOffset(e: React.PointerEvent): { dx: number; dy: number } {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      dx: e.clientX - (rect.left + DPAD_SIZE / 2),
      dy: e.clientY - (rect.top  + DPAD_SIZE / 2),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    containerRef.current!.setPointerCapture(e.pointerId);
    const { dx, dy } = getOffset(e);
    applyDirs(getDirsFromOffset(dx, dy));
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!containerRef.current!.hasPointerCapture(e.pointerId)) return;
    e.preventDefault();
    const { dx, dy } = getOffset(e);
    applyDirs(getDirsFromOffset(dx, dy));
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.preventDefault();
    releaseAll();
  }

  function handlePointerCancel() {
    releaseAll();
  }

  function blockTouch(e: React.TouchEvent) {
    e.preventDefault();
  }

  useEffect(() => () => releaseAll(), []);

  return (
    <div
      ref={containerRef}
      className="gba-dpad"
      aria-label="D-pad"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onTouchStart={blockTouch}
      onTouchMove={blockTouch}
      onTouchEnd={blockTouch}
    >
      {/* Cross visual — 3×3 CSS grid, corners empty */}
      <div ref={cellRefs.Up}    className="dpad-cell dpad-cell--up">▲</div>
      <div ref={cellRefs.Left}  className="dpad-cell dpad-cell--left">◄</div>
      <div className="dpad-cell dpad-cell--center" aria-hidden />
      <div ref={cellRefs.Right} className="dpad-cell dpad-cell--right">►</div>
      <div ref={cellRefs.Down}  className="dpad-cell dpad-cell--down">▼</div>
    </div>
  );
}

// ── Turbo-capable action button (A / B) ──────────────────────────────────────

const TURBO_INTERVAL_MS = 50; // rapid-fire every 50 ms (~20 presses/sec)

interface TurboButtonProps {
  button: GbaButton;
  label: string;
  className: string;
  'aria-label': string;
  turboActive: boolean;
  /** Latch mode: tap once to start firing continuously, tap again to stop. No holding required. */
  turboLatch?: boolean;
}

function TurboButton({ button, label, className, 'aria-label': ariaLabel, turboActive, turboLatch = false }: TurboButtonProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turboPhaseRef = useRef<boolean>(false);
  const turboActiveRef = useRef(turboActive);
  turboActiveRef.current = turboActive;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      emulatorService.releaseButton(button);
    };
  }, [button]);

  // If turbo is toggled off externally while latch is running, stop the interval
  useEffect(() => {
    if (!turboActive && intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      emulatorService.releaseButton(button);
      turboPhaseRef.current = false;
    }
  }, [turboActive, button]);

  function startTurbo() {
    if (intervalRef.current !== null) return;
    emulatorService.pressButton(button);
    turboPhaseRef.current = true;
    intervalRef.current = setInterval(() => {
      if (turboPhaseRef.current) {
        emulatorService.releaseButton(button);
        turboPhaseRef.current = false;
      } else {
        emulatorService.pressButton(button);
        turboPhaseRef.current = true;
      }
    }, TURBO_INTERVAL_MS);
  }

  function stopTurbo() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    emulatorService.releaseButton(button);
    turboPhaseRef.current = false;
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (!turboActiveRef.current) {
      emulatorService.pressButton(button);
      return;
    }
    if (turboLatch) {
      // Latch mode: tap toggles the continuous interval on/off
      intervalRef.current !== null ? stopTurbo() : startTurbo();
    } else {
      startTurbo();
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.preventDefault();
    if (!turboActiveRef.current) {
      emulatorService.releaseButton(button);
      return;
    }
    // Latch mode: release does nothing — interval keeps running until next tap
    if (!turboLatch) stopTurbo();
  }

  function handlePointerLeave(e: React.PointerEvent) {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    if (!turboActiveRef.current) {
      emulatorService.releaseButton(button);
      return;
    }
    if (!turboLatch) stopTurbo();
  }

  function handlePointerCancel() {
    if (!turboActiveRef.current) {
      emulatorService.releaseButton(button);
      return;
    }
    if (!turboLatch) stopTurbo();
  }

  function handleTouch(e: React.TouchEvent) {
    e.preventDefault();
  }

  function handleTouchCancel(e: React.TouchEvent) {
    e.preventDefault();
    if (!turboActiveRef.current) {
      emulatorService.releaseButton(button);
      return;
    }
    if (!turboLatch) stopTurbo();
  }

  return (
    <button
      className={`${className} ${turboActive ? `${className}--turbo` : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouch}
      onTouchEnd={handleTouch}
      onTouchMove={handleTouch}
      onTouchCancel={handleTouchCancel}
      aria-label={ariaLabel}
      aria-pressed={turboActive}
      type="button"
    >
      {label}
    </button>
  );
}

export function GbaControls() {
  const alignment = useUiStore((s) => s.mobileControlAlignment);
  const setAlignment = useUiStore((s) => s.setMobileControlAlignment);
  const isTurboA = useEmulatorStore((s) => s.isTurboA);
  const isTurboB = useEmulatorStore((s) => s.isTurboB);
  const toggleTurboA = useEmulatorStore((s) => s.toggleTurboA);
  const toggleTurboB = useEmulatorStore((s) => s.toggleTurboB);

  const toggleAlignment = () => {
    if (alignment === 'default') setAlignment('left');
    else if (alignment === 'left') setAlignment('right');
    else setAlignment('default');
  };

  return (
    <div className={`gba-controls gba-controls--align-${alignment}`} role="group" aria-label="GBA controller">

      {/* ── Shoulder buttons ── */}
      <div className="gba-controls__shoulders">
        <ControlButton
          button="L"
          label="L"
          className="gba-controls__shoulder gba-controls__shoulder--l"
          aria-label="L shoulder button"
        />
        <button
          className="gba-controls__alignment-toggle"
          onClick={toggleAlignment}
          aria-label="Toggle one-handed mode"
          type="button"
        >
          {alignment === 'default' ? 'L/R' : alignment === 'left' ? 'LEFT' : 'RIGHT'}
        </button>
        <ControlButton
          button="R"
          label="R"
          className="gba-controls__shoulder gba-controls__shoulder--r"
          aria-label="R shoulder button"
        />
      </div>

      {/* ── Main body ── */}
      <div className="gba-controls__body">

        {/* D-pad */}
        <DPad />

        {/* Center cluster: Select + Start */}
        <div className="gba-controls__center">
          <ControlButton
            button="Select"
            label="SELECT"
            className="gba-controls__pill"
            aria-label="Select button"
          />
          <ControlButton
            button="Start"
            label="START"
            className="gba-controls__pill"
            aria-label="Start button"
          />
        </div>

        {/* A + B buttons */}
        <div className="gba-controls__ab" aria-label="Action buttons">
          <div className="gba-controls__ab-col">
            <TurboButton
              button="B"
              label="B"
              className="gba-controls__action gba-controls__action--b"
              aria-label="B button"
              turboActive={isTurboB}
            />
            <button
              className={`gba-controls__turbo-toggle ${isTurboB ? 'gba-controls__turbo-toggle--on' : ''}`}
              onClick={toggleTurboB}
              type="button"
              aria-label="Toggle turbo B"
              aria-pressed={isTurboB}
            >
              {isTurboB ? '⚡B' : 'TB'}
            </button>
          </div>
          <div className="gba-controls__ab-col">
            <TurboButton
              button="A"
              label="A"
              className="gba-controls__action gba-controls__action--a"
              aria-label="A button"
              turboActive={isTurboA}
              turboLatch
            />
            <button
              className={`gba-controls__turbo-toggle ${isTurboA ? 'gba-controls__turbo-toggle--on' : ''}`}
              onClick={toggleTurboA}
              type="button"
              aria-label="Toggle turbo A"
              aria-pressed={isTurboA}
            >
              {isTurboA ? '⚡A' : 'TA'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .gba-controls {
          width: 480px;
          background: var(--color-surface-2);
          border: 2px solid var(--color-border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-2) var(--space-3) var(--space-3);
          box-shadow: var(--shadow-purple-sm), inset 0 2px 0 rgba(255,255,255,0.05);
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
        }

        /* ── Shoulders ── */
        .gba-controls__shoulders {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .gba-controls__shoulder {
          width: 72px;
          height: 24px;
          background: var(--color-btn-lr);
          border: 2px solid #546E7A;
          border-radius: var(--radius-sm);
          color: var(--color-text-primary);
          font-family: var(--font-pixel);
          font-size: 0.45rem;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition:
            background-color var(--transition-fast),
            box-shadow var(--transition-fast),
            transform var(--transition-fast);
          touch-action: none;
        }
        .gba-controls__shoulder:active,
        .gba-controls__shoulder--pressed {
          background: #546E7A;
          box-shadow: 0 0 8px rgba(0,229,255,0.4);
          transform: translateY(1px);
        }
        .gba-controls__shoulder--l { border-radius: var(--radius-md) var(--radius-sm) var(--radius-sm) var(--radius-sm); }
        .gba-controls__shoulder--r { border-radius: var(--radius-sm) var(--radius-md) var(--radius-sm) var(--radius-sm); }

        .gba-controls__alignment-toggle {
          display: none;
        }

        /* ── Body row ── */
        .gba-controls__body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }

        /* ── D-pad (thumbstick capture zone) ── */
        .gba-dpad {
          width: 120px;
          height: 120px;
          display: grid;
          grid-template-columns: 40px 40px 40px;
          grid-template-rows: 40px 40px 40px;
          touch-action: none;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
        }

        .dpad-cell {
          background: var(--color-btn-dpad);
          border: 2px solid #37474F;
          color: var(--color-text-secondary);
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transition: background-color var(--transition-fast);
        }

        /* cross shape — corners left empty (transparent) */
        .dpad-cell--up    { grid-column: 2; grid-row: 1; border-radius: var(--radius-sm) var(--radius-sm) 0 0; }
        .dpad-cell--left  { grid-column: 1; grid-row: 2; border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
        .dpad-cell--center{ grid-column: 2; grid-row: 2; }
        .dpad-cell--right { grid-column: 3; grid-row: 2; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
        .dpad-cell--down  { grid-column: 2; grid-row: 3; border-radius: 0 0 var(--radius-sm) var(--radius-sm); }

        .dpad-cell--active {
          background: #37474F;
          color: var(--color-text-bright);
        }

        /* ── Center pills ── */
        .gba-controls__center {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: var(--space-2);
          align-self: flex-end;
          margin-bottom: var(--space-2);
        }

        .gba-controls__pill {
          width: 56px;
          height: 18px;
          background: var(--color-btn-select);
          border: 2px solid #546E7A;
          border-radius: var(--radius-pill);
          color: var(--color-text-muted);
          font-family: var(--font-pixel);
          font-size: 0.3rem;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition:
            background-color var(--transition-fast),
            color var(--transition-fast),
            box-shadow var(--transition-fast),
            transform var(--transition-fast);
          touch-action: none;
        }
        .gba-controls__pill:active {
          background: #546E7A;
          color: var(--color-text-bright);
          box-shadow: 0 0 6px rgba(0,229,255,0.3);
          transform: scale(0.95);
        }

        /* ── A / B buttons ── */
        .gba-controls__ab {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          position: relative;
        }

        .gba-controls__ab-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .gba-controls__action {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 3px solid rgba(0,0,0,0.4);
          color: var(--color-text-bright);
          font-family: var(--font-pixel);
          font-size: 0.65rem;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition:
            filter var(--transition-fast),
            box-shadow var(--transition-fast),
            transform var(--transition-fast);
          touch-action: none;
        }

        .gba-controls__action--a {
          background: var(--color-btn-a);
          box-shadow: 0 4px 0 #7F0000, 0 0 10px rgba(255,23,68,0.5);
        }
        .gba-controls__action--a:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #7F0000, 0 0 14px rgba(255,23,68,0.8);
        }
        .gba-controls__action--a--turbo {
          box-shadow: 0 4px 0 #7F0000, 0 0 16px rgba(255,23,68,0.9), 0 0 4px 2px rgba(255,200,0,0.6);
          animation: turbo-pulse-a 0.1s step-end infinite;
        }

        .gba-controls__action--b {
          background: var(--color-btn-b);
          box-shadow: 0 4px 0 #7F5200, 0 0 10px rgba(255,171,0,0.5);
        }
        .gba-controls__action--b:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #7F5200, 0 0 14px rgba(255,171,0,0.8);
        }
        .gba-controls__action--b--turbo {
          box-shadow: 0 4px 0 #7F5200, 0 0 16px rgba(255,171,0,0.9), 0 0 4px 2px rgba(255,200,0,0.6);
          animation: turbo-pulse-b 0.1s step-end infinite;
        }

        @keyframes turbo-pulse-a {
          0%, 100% { filter: brightness(1); }
          50%       { filter: brightness(1.4); }
        }
        @keyframes turbo-pulse-b {
          0%, 100% { filter: brightness(1); }
          50%       { filter: brightness(1.4); }
        }

        /* ── Turbo toggle pill ── */
        .gba-controls__turbo-toggle {
          width: 36px;
          height: 14px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: var(--radius-pill);
          color: var(--color-text-muted);
          font-family: var(--font-pixel);
          font-size: 0.3rem;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: background var(--transition-fast), border-color var(--transition-fast);
          touch-action: manipulation;
        }
        .gba-controls__turbo-toggle--on {
          background: rgba(255, 200, 0, 0.25);
          border-color: rgba(255, 200, 0, 0.7);
          color: #FFD700;
          text-shadow: 0 0 6px rgba(255,200,0,0.8);
        }

        /* Use pointer type rather than viewport width to detect touch devices.
           This ensures mobile controls show correctly in landscape orientation,
           where a phone's width exceeds 768px but input is still touch-based. */
        @media (pointer: coarse) {
          .gba-controls {
            width: 100%;
            padding: var(--space-2) var(--space-2) 40px var(--space-2);
            position: relative;
          }
          .gba-controls__alignment-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--color-border-subtle);
            border-radius: var(--radius-sm);
            color: var(--color-text-secondary);
            font-family: var(--font-pixel);
            font-size: 0.35rem;
            padding: 0 8px;
            cursor: pointer;
            z-index: 10;
          }
          .gba-controls__alignment-toggle:active {
            background: rgba(0, 0, 0, 0.4);
          }
          .gba-controls__body {
            justify-content: space-between;
          }
          .gba-controls--align-left .gba-controls__body {
            justify-content: flex-start;
            gap: 32px;
          }
          .gba-controls--align-right .gba-controls__body {
            justify-content: flex-end;
            gap: 32px;
          }
          .gba-controls__center {
            position: absolute;
            bottom: var(--space-2);
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
}
