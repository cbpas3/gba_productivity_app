import { useState, useEffect, useRef } from 'react';
import { useGamepadStore } from '../../store/gamepadStore';
import { useUiStore } from '../../store/uiStore';
import type { GbaButton } from '../../types/emulator';
import type { GamepadMapping } from '../../types/gamepad';
import { GBA_BUTTONS } from '../../types/gamepad';

type ListeningFor = GbaButton | null;

function useGamepadSnapshot() {
  const [snapshot, setSnapshot] = useState<Gamepad | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function poll() {
      const gp = navigator.getGamepads().find((g) => g !== null) ?? null;
      setSnapshot(gp ? { ...gp, buttons: [...gp.buttons], axes: [...gp.axes] } as unknown as Gamepad : null);
      rafRef.current = requestAnimationFrame(poll);
    }
    rafRef.current = requestAnimationFrame(poll);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  return snapshot;
}

function getAssignedButton(mapping: GamepadMapping, gba: GbaButton): string {
  const bm = mapping.buttonMappings.find((m) => m.gbaButton === gba);
  if (bm) return `Btn ${bm.buttonIndex}`;
  const am = mapping.axisMappings.find((m) => m.gbaButton === gba);
  if (am) return `Axis ${am.axisIndex}${am.direction === -1 ? '−' : '+'}`;
  return '—';
}

export function GamepadMapperModal() {
  const isOpen = useUiStore((s) => s.isGamepadMapperOpen);
  const setIsOpen = useUiStore((s) => s.setIsGamepadMapperOpen);
  const isConnected = useGamepadStore((s) => s.isConnected);
  const gamepadId = useGamepadStore((s) => s.gamepadId);
  const mapping = useGamepadStore((s) => s.mapping);
  const setMapping = useGamepadStore((s) => s.setMapping);
  const resetMapping = useGamepadStore((s) => s.resetMapping);

  const [listening, setListening] = useState<ListeningFor>(null);
  const [draftMapping, setDraftMapping] = useState<GamepadMapping>(mapping);
  const gp = useGamepadSnapshot();

  // Sync draft when modal opens
  useEffect(() => {
    if (isOpen) setDraftMapping(mapping);
  }, [isOpen, mapping]);

  // Detect input while listening
  const prevGp = useRef<Gamepad | null>(null);
  useEffect(() => {
    if (!listening || !gp) return;

    const prev = prevGp.current;

    // Detect newly pressed button
    for (let i = 0; i < gp.buttons.length; i++) {
      const wasPressed = prev?.buttons[i]?.pressed ?? false;
      if (gp.buttons[i].pressed && !wasPressed) {
        assignButton(listening, i);
        setListening(null);
        break;
      }
    }

    // Detect axis exceeding threshold (only on change from neutral)
    for (let i = 0; i < gp.axes.length; i++) {
      const val = gp.axes[i];
      const prevVal = prev?.axes[i] ?? 0;
      if (Math.abs(val) > 0.7 && Math.abs(prevVal) <= 0.7) {
        const dir = val < 0 ? -1 : 1;
        assignAxis(listening, i, dir as -1 | 1);
        setListening(null);
        break;
      }
    }

    prevGp.current = gp;
  });

  function assignButton(gba: GbaButton, buttonIndex: number) {
    setDraftMapping((prev) => {
      const buttonMappings = prev.buttonMappings
        .filter((m) => m.gbaButton !== gba)
        .concat({ buttonIndex, gbaButton: gba });
      const axisMappings = prev.axisMappings.filter((m) => m.gbaButton !== gba);
      return { ...prev, buttonMappings, axisMappings };
    });
  }

  function assignAxis(gba: GbaButton, axisIndex: number, direction: -1 | 1) {
    setDraftMapping((prev) => {
      const axisMappings = prev.axisMappings
        .filter((m) => !(m.gbaButton === gba))
        .concat({ axisIndex, direction, gbaButton: gba });
      const buttonMappings = prev.buttonMappings.filter((m) => m.gbaButton !== gba);
      return { ...prev, buttonMappings, axisMappings };
    });
  }

  function handleSave() {
    setMapping(draftMapping);
    setIsOpen(false);
  }

  function handleReset() {
    resetMapping();
    setListening(null);
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => { setListening(null); setIsOpen(false); }}>
      <div className="modal-box gpm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title glow-text--cyan">🎮 CONTROLLER MAP</span>
          <button className="btn btn--ghost modal-close" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        <div className="gpm-status">
          {isConnected
            ? <span className="gpm-status--ok">● CONNECTED: {gamepadId?.slice(0, 40)}</span>
            : <span className="gpm-status--off">● NO CONTROLLER DETECTED — Press any button on your controller to pair</span>
          }
        </div>

        {listening && (
          <div className="gpm-listening">
            Press a button or move a stick on your controller to map <strong>{listening}</strong>
          </div>
        )}

        <div className="gpm-grid">
          {GBA_BUTTONS.map((gba) => (
            <div key={gba} className={`gpm-row ${listening === gba ? 'gpm-row--listening' : ''}`}>
              <span className="gpm-gba-label">{gba}</span>
              <span className="gpm-assigned">{getAssignedButton(draftMapping, gba)}</span>
              <button
                className={`btn gpm-remap-btn ${listening === gba ? 'gpm-remap-btn--active' : ''}`}
                onClick={() => setListening(listening === gba ? null : gba)}
                disabled={!isConnected}
              >
                {listening === gba ? 'CANCEL' : 'REMAP'}
              </button>
            </div>
          ))}
        </div>

        <div className="gpm-actions">
          <button className="btn btn--secondary" onClick={handleReset}>
            RESET DEFAULTS
          </button>
          <button className="btn btn--primary" onClick={handleSave}>
            SAVE
          </button>
        </div>

        <style>{`
          .gpm-modal {
            width: min(420px, 92vw);
            max-height: 85vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }
          .gpm-status {
            font-family: var(--font-pixel);
            font-size: 0.38rem;
            letter-spacing: 0.06em;
            line-height: 1.6;
          }
          .gpm-status--ok   { color: var(--color-accent-green); }
          .gpm-status--off  { color: var(--color-text-muted); }
          .gpm-listening {
            font-family: var(--font-pixel);
            font-size: 0.4rem;
            color: var(--color-accent-yellow);
            background: rgba(255,214,0,0.08);
            border: 1px solid rgba(255,214,0,0.4);
            border-radius: var(--radius-sm);
            padding: var(--space-2) var(--space-3);
            letter-spacing: 0.06em;
            line-height: 1.8;
            animation: badge-pulse 1s ease-in-out infinite;
          }
          .gpm-grid {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .gpm-row {
            display: grid;
            grid-template-columns: 5rem 1fr auto;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-1) var(--space-2);
            border-radius: var(--radius-sm);
            background: var(--color-surface-1);
            border: 1px solid transparent;
          }
          .gpm-row--listening {
            border-color: var(--color-accent-yellow);
            background: rgba(255,214,0,0.05);
          }
          .gpm-gba-label {
            font-family: var(--font-pixel);
            font-size: 0.45rem;
            color: var(--color-accent-cyan);
            letter-spacing: 0.06em;
          }
          .gpm-assigned {
            font-family: var(--font-pixel);
            font-size: 0.4rem;
            color: var(--color-text-secondary);
          }
          .gpm-remap-btn {
            font-family: var(--font-pixel);
            font-size: 0.38rem;
            padding: 3px 8px;
            border-radius: var(--radius-sm);
            background: var(--color-surface-body);
            border: 1px solid var(--color-border-subtle);
            color: var(--color-text-muted);
            cursor: pointer;
          }
          .gpm-remap-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .gpm-remap-btn--active {
            background: rgba(255,214,0,0.15);
            border-color: var(--color-accent-yellow);
            color: var(--color-accent-yellow);
          }
          .gpm-actions {
            display: flex;
            gap: var(--space-2);
            justify-content: flex-end;
            padding-top: var(--space-2);
            border-top: 1px solid var(--color-border-subtle);
          }
        `}</style>
      </div>
    </div>
  );
}
