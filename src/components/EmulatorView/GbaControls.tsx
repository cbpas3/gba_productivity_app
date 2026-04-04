import { emulatorService } from '../../services/emulatorService';
import type { GbaButton } from '../../types/emulator';
import { useUiStore } from '../../store/uiStore';

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
    // Only release when the pointer is NOT captured. While captured (i.e. the user
    // is actively holding the button), pointerLeave still fires if the pointer drifts
    // outside the element bounds, but pointerUp will release it — so releasing here
    // too would drop the button prematurely on any slight finger movement.
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      emulatorService.releaseButton(button);
    }
  }

  function handlePointerCancel() {
    // Release if OS interrupts the pointer (e.g. phone call, notification)
    emulatorService.releaseButton(button);
  }

  // Explicitly prevent default on touch events to stop Safari from scrolling
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

export function GbaControls() {
  const alignment = useUiStore((s) => s.mobileControlAlignment);
  const setAlignment = useUiStore((s) => s.setMobileControlAlignment);

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
        <div className="gba-controls__dpad" aria-label="D-pad">
          <ControlButton
            button="Up"
            label="▲"
            className="gba-controls__dpad-btn gba-controls__dpad-btn--up"
            aria-label="D-pad Up"
          />
          <div className="gba-controls__dpad-row">
            <ControlButton
              button="Left"
              label="◄"
              className="gba-controls__dpad-btn gba-controls__dpad-btn--left"
              aria-label="D-pad Left"
            />
            <div className="gba-controls__dpad-center" aria-hidden />
            <ControlButton
              button="Right"
              label="►"
              className="gba-controls__dpad-btn gba-controls__dpad-btn--right"
              aria-label="D-pad Right"
            />
          </div>
          <ControlButton
            button="Down"
            label="▼"
            className="gba-controls__dpad-btn gba-controls__dpad-btn--down"
            aria-label="D-pad Down"
          />
        </div>

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
          <ControlButton
            button="B"
            label="B"
            className="gba-controls__action gba-controls__action--b"
            aria-label="B button"
          />
          <ControlButton
            button="A"
            label="A"
            className="gba-controls__action gba-controls__action--a"
            aria-label="A button"
          />
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

        /* ── D-pad ── */
        .gba-controls__dpad {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        .gba-controls__dpad-row {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .gba-controls__dpad-btn {
          width: 40px;
          height: 40px;
          background: var(--color-btn-dpad);
          border: 2px solid #37474F;
          color: var(--color-text-secondary);
          font-size: 0.7rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color var(--transition-fast), transform var(--transition-fast);
          touch-action: none;
        }

        .gba-controls__dpad-btn--up    { border-radius: var(--radius-sm) var(--radius-sm) 0 0; }
        .gba-controls__dpad-btn--down  { border-radius: 0 0 var(--radius-sm) var(--radius-sm); }
        .gba-controls__dpad-btn--left  { border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
        .gba-controls__dpad-btn--right { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }

        .gba-controls__dpad-btn:active {
          background: #37474F;
          transform: scale(0.92);
        }

        .gba-controls__dpad-center {
          width: 40px;
          height: 40px;
          background: var(--color-btn-dpad);
          border: 2px solid #37474F;
          pointer-events: none;
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
          gap: var(--space-1);
          position: relative;
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
          align-self: flex-start;
          margin-top: 0;
        }
        .gba-controls__action--a:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #7F0000, 0 0 14px rgba(255,23,68,0.8);
        }

        .gba-controls__action--b {
          background: var(--color-btn-b);
          box-shadow: 0 4px 0 #7F5200, 0 0 10px rgba(255,171,0,0.5);
          align-self: flex-end;
          margin-bottom: 0;
        }
        .gba-controls__action--b:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #7F5200, 0 0 14px rgba(255,171,0,0.8);
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
