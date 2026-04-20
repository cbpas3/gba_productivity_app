import { useState, useEffect, useRef } from 'react';
import { useGamepadStore } from '../../store/gamepadStore';
import { useUiStore } from '../../store/uiStore';
import type { GbaButton } from '../../types/emulator';
import type { GamepadMapping } from '../../types/gamepad';
import { GBA_BUTTONS, APP_ACTIONS, APP_ACTION_LABELS } from '../../types/gamepad';
import type { AppAction } from '../../types/gamepad';

type ListeningTarget = { kind: 'gba'; gba: GbaButton } | { kind: 'action'; action: AppAction } | null;

/** Plain-object snapshot of gamepad state — values are copied, not live references. */
type GpSnapshot = {
  buttons: { pressed: boolean; value: number }[];
  axes: number[];
};

function cloneSnapshot(): GpSnapshot | null {
  const gp = navigator.getGamepads().find((g) => g !== null) ?? null;
  if (!gp) return null;
  return {
    buttons: Array.from(gp.buttons).map((b) => ({ pressed: b.pressed, value: b.value })),
    axes: Array.from(gp.axes),
  };
}

function useGamepadSnapshot() {
  const [snapshot, setSnapshot] = useState<GpSnapshot | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function poll() {
      setSnapshot(cloneSnapshot());
      rafRef.current = requestAnimationFrame(poll);
    }
    rafRef.current = requestAnimationFrame(poll);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  return snapshot;
}

function getAssignedGba(mapping: GamepadMapping, gba: GbaButton): string {
  const bm = mapping.buttonMappings.find((m) => m.gbaButton === gba);
  if (bm) return `Btn ${bm.buttonIndex}`;
  const am = mapping.axisMappings.find((m) => m.gbaButton === gba);
  if (am) return `Axis ${am.axisIndex}${am.direction === -1 ? '−' : '+'}`;
  return '—';
}

function getAssignedAction(mapping: GamepadMapping, action: AppAction): string {
  const am = mapping.actionMappings.find((m) => m.action === action);
  return am ? `Btn ${am.buttonIndex}` : '—';
}

export function GamepadMapperModal() {
  const isOpen = useUiStore((s) => s.isGamepadMapperOpen);
  const setIsOpen = useUiStore((s) => s.setIsGamepadMapperOpen);
  const isConnected = useGamepadStore((s) => s.isConnected);
  const gamepadId = useGamepadStore((s) => s.gamepadId);
  const mapping = useGamepadStore((s) => s.mapping);
  const setMapping = useGamepadStore((s) => s.setMapping);
  const resetMapping = useGamepadStore((s) => s.resetMapping);

  const [listening, setListening] = useState<ListeningTarget>(null);
  const [draftMapping, setDraftMapping] = useState<GamepadMapping>(mapping);
  const gp = useGamepadSnapshot();

  useEffect(() => {
    if (isOpen) {
      setDraftMapping(mapping);
      setListening(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Button/axis detection — compares deep-cloned snapshots frame-to-frame
  const prevSnap = useRef<GpSnapshot | null>(null);
  useEffect(() => {
    if (!listening || !gp) {
      prevSnap.current = gp;
      return;
    }

    const prev = prevSnap.current;

    // Detect newly pressed button (false → true transition)
    for (let i = 0; i < gp.buttons.length; i++) {
      const wasPressed = prev?.buttons[i]?.pressed ?? false;
      if (gp.buttons[i].pressed && !wasPressed) {
        if (listening.kind === 'gba') {
          assignGbaButton(listening.gba, i);
        } else {
          assignAction(listening.action, i);
        }
        setListening(null);
        break;
      }
    }

    // Detect axis threshold crossing — only for GBA buttons (not actions)
    if (listening.kind === 'gba') {
      for (let i = 0; i < gp.axes.length; i++) {
        const val = gp.axes[i];
        const prevVal = prev?.axes[i] ?? 0;
        if (Math.abs(val) > 0.7 && Math.abs(prevVal) <= 0.7) {
          assignGbaAxis(listening.gba, i, val < 0 ? -1 : 1);
          setListening(null);
          break;
        }
      }
    }

    prevSnap.current = gp;
  });

  function assignGbaButton(gba: GbaButton, buttonIndex: number) {
    setDraftMapping((prev) => ({
      ...prev,
      buttonMappings: prev.buttonMappings
        .filter((m) => m.gbaButton !== gba)
        .concat({ buttonIndex, gbaButton: gba }),
      axisMappings: prev.axisMappings.filter((m) => m.gbaButton !== gba),
    }));
  }

  function assignGbaAxis(gba: GbaButton, axisIndex: number, direction: -1 | 1) {
    setDraftMapping((prev) => ({
      ...prev,
      axisMappings: prev.axisMappings
        .filter((m) => m.gbaButton !== gba)
        .concat({ axisIndex, direction, gbaButton: gba }),
      buttonMappings: prev.buttonMappings.filter((m) => m.gbaButton !== gba),
    }));
  }

  function assignAction(action: AppAction, buttonIndex: number) {
    setDraftMapping((prev) => ({
      ...prev,
      actionMappings: prev.actionMappings
        .filter((m) => m.action !== action)
        .concat({ buttonIndex, action }),
    }));
  }

  function clearAction(action: AppAction) {
    setDraftMapping((prev) => ({
      ...prev,
      actionMappings: prev.actionMappings.filter((m) => m.action !== action),
    }));
  }

  function handleSave() {
    setMapping(draftMapping);
    setIsOpen(false);
  }

  function handleReset() {
    resetMapping();
    setDraftMapping({ ...useGamepadStore.getState().mapping });
    setListening(null);
  }

  function listeningLabel(): string {
    if (!listening) return '';
    return listening.kind === 'gba' ? listening.gba : APP_ACTION_LABELS[listening.action];
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => { setListening(null); setIsOpen(false); }}>
      <div className="modal-box gpm-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Fixed header ── */}
        <div className="gpm-header">
          <div className="modal-header">
            <span className="modal-title glow-text--cyan">🎮 CONTROLLER MAP</span>
            <button className="btn btn--ghost modal-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="gpm-status">
            {isConnected
              ? <span className="gpm-status--ok">● CONNECTED: {gamepadId?.slice(0, 40)}</span>
              : <span className="gpm-status--off">● NO CONTROLLER DETECTED — press any button to pair</span>
            }
          </div>

          {listening && (
            <div className="gpm-listening">
              Press a button{listening.kind === 'gba' ? ' or move a stick' : ''} to map <strong>{listeningLabel()}</strong>
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="gpm-body">
          <p className="gpm-section-label">GBA BUTTONS</p>
          <div className="gpm-grid">
            {GBA_BUTTONS.map((gba) => {
              const isListening = listening?.kind === 'gba' && listening.gba === gba;
              return (
                <div key={gba} className={`gpm-row ${isListening ? 'gpm-row--listening' : ''}`}>
                  <span className="gpm-gba-label">{gba}</span>
                  <span className="gpm-assigned">{getAssignedGba(draftMapping, gba)}</span>
                  <button
                    className={`btn gpm-remap-btn ${isListening ? 'gpm-remap-btn--active' : ''}`}
                    onClick={() => setListening(isListening ? null : { kind: 'gba', gba })}
                    disabled={!isConnected}
                  >
                    {isListening ? 'CANCEL' : 'REMAP'}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="gpm-section-label" style={{ marginTop: '8px' }}>APP ACTIONS</p>
          <div className="gpm-grid">
            {APP_ACTIONS.map((action) => {
              const isListening = listening?.kind === 'action' && listening.action === action;
              const assigned = getAssignedAction(draftMapping, action);
              return (
                <div key={action} className={`gpm-row ${isListening ? 'gpm-row--listening' : ''}`}>
                  <span className="gpm-gba-label">{APP_ACTION_LABELS[action]}</span>
                  <span className="gpm-assigned">{assigned}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {assigned !== '—' && (
                      <button
                        className="btn gpm-remap-btn"
                        onClick={() => clearAction(action)}
                        title="Clear"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      className={`btn gpm-remap-btn ${isListening ? 'gpm-remap-btn--active' : ''}`}
                      onClick={() => setListening(isListening ? null : { kind: 'action', action })}
                      disabled={!isConnected}
                    >
                      {isListening ? 'CANCEL' : 'REMAP'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sticky footer ── */}
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
            /* Use dvh so the modal never extends behind the bottom nav */
            max-height: min(85vh, calc(100dvh - 90px));
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .gpm-header {
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
          }
          .gpm-body {
            flex: 1;
            overflow-y: auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: var(--space-1) 0;
          }
          .gpm-section-label {
            font-family: var(--font-pixel);
            font-size: 0.35rem;
            color: var(--color-text-muted);
            letter-spacing: 0.1em;
            margin: 0 0 2px;
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
            grid-template-columns: 6rem 1fr auto;
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
            font-size: 0.4rem;
            color: var(--color-accent-cyan);
            letter-spacing: 0.04em;
          }
          .gpm-assigned {
            font-family: var(--font-pixel);
            font-size: 0.4rem;
            color: var(--color-text-secondary);
          }
          .gpm-remap-btn {
            font-family: var(--font-pixel);
            font-size: 0.35rem;
            padding: 3px 8px;
            border-radius: var(--radius-sm);
            background: var(--color-surface-body);
            border: 1px solid var(--color-border-subtle);
            color: var(--color-text-muted);
            cursor: pointer;
            white-space: nowrap;
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
            flex-shrink: 0;
            display: flex;
            gap: var(--space-2);
            justify-content: flex-end;
            padding-top: var(--space-3);
            border-top: 1px solid var(--color-border-subtle);
          }
          @media (max-width: 768px) {
            .gpm-modal {
              max-height: calc(100dvh - 100px);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
