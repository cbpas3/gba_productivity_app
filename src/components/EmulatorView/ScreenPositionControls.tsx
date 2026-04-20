import { useState, useRef, useEffect } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useEmulatorStore } from '../../store/emulatorStore';
import { useGamepadStore } from '../../store/gamepadStore';

const NUDGE = 5;
const FADE_DELAY = 3000;

interface Props {
  isPortrait: boolean;
}

export function ScreenPositionControls({ isPortrait }: Props) {
  const isFullscreen = useEmulatorStore((s) => s.isFullscreen);
  const isConnected  = useGamepadStore((s) => s.isConnected);
  const offset       = useUiStore((s) => s.screenVerticalOffset);
  const setOffset    = useUiStore((s) => s.setScreenVerticalOffset);

  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show briefly whenever conditions become active
  useEffect(() => {
    if (isFullscreen && isPortrait && isConnected) {
      wake();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isFullscreen, isPortrait, isConnected]);

  function wake() {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), FADE_DELAY);
  }

  function nudge(delta: number) {
    setOffset(offset + delta);
    wake();
  }

  function reset() {
    setOffset(0);
    wake();
  }

  if (!isFullscreen || !isPortrait || !isConnected) return null;

  return (
    <div
      className={`screen-pos ${visible ? 'screen-pos--visible' : ''}`}
      onPointerDown={(e) => { e.stopPropagation(); wake(); }}
    >
      <button className="screen-pos__btn" onClick={() => nudge(-NUDGE)} aria-label="Move screen up">
        ▲
      </button>
      <button
        className={`screen-pos__btn screen-pos__btn--reset ${offset === 0 ? 'screen-pos__btn--at-center' : ''}`}
        onClick={reset}
        aria-label="Reset screen position"
      >
        ◎
      </button>
      <button className="screen-pos__btn" onClick={() => nudge(NUDGE)} aria-label="Move screen down">
        ▼
      </button>

      <style>{`
        .screen-pos {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 200;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .screen-pos--visible {
          opacity: 1;
          pointer-events: auto;
        }
        .screen-pos__btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(0, 229, 255, 0.5);
          background: rgba(10, 0, 30, 0.75);
          color: rgba(0, 229, 255, 0.9);
          font-size: 0.9rem;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          transition: background 0.15s, border-color 0.15s;
          padding: 0;
        }
        .screen-pos__btn:active {
          background: rgba(0, 229, 255, 0.2);
          border-color: rgba(0, 229, 255, 0.9);
        }
        .screen-pos__btn--reset {
          font-size: 1rem;
          border-color: rgba(206, 147, 216, 0.5);
          color: rgba(206, 147, 216, 0.9);
        }
        .screen-pos__btn--at-center {
          opacity: 0.35;
        }
        .screen-pos__btn--reset:active {
          background: rgba(206, 147, 216, 0.2);
          border-color: rgba(206, 147, 216, 0.9);
        }
      `}</style>
    </div>
  );
}
