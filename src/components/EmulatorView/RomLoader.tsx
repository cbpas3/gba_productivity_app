import { useRef } from 'react';
import { emulatorService } from '../../services/emulatorService';
import { useEmulatorStore } from '../../store/emulatorStore';

export function RomLoader() {
  const romInputRef  = useRef<HTMLInputElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  const romLoaded = useEmulatorStore((s) => s.romLoaded);
  const gameName  = useEmulatorStore((s) => s.gameName);
  const status    = useEmulatorStore((s) => s.status);
  const setRomLoaded = useEmulatorStore((s) => s.setRomLoaded);
  const setError     = useEmulatorStore((s) => s.setError);

  const isLoading = status === 'loading';

  async function handleRomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected if needed
    e.target.value = '';

    try {
      const accepted = await emulatorService.loadRom(file);
      if (accepted) {
        setRomLoaded(file.name);
      } else {
        setError(`ROM rejected by emulator: "${file.name}" may be unsupported or corrupt.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load ROM: ${message}`);
    }
  }

  async function handleSaveChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    try {
      await emulatorService.loadSave(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load save: ${message}`);
    }
  }

  return (
    <div className="rom-loader">
      {/* Hidden file inputs */}
      <input
        ref={romInputRef}
        type="file"
        accept=".gba,.gbc,.gb"
        className="rom-loader__hidden-input"
        onChange={handleRomChange}
        aria-label="Select ROM file"
        tabIndex={-1}
      />
      <input
        ref={saveInputRef}
        type="file"
        accept=".sav"
        className="rom-loader__hidden-input"
        onChange={handleSaveChange}
        aria-label="Select save file"
        tabIndex={-1}
      />

      {/* ROM name display */}
      {romLoaded && gameName && (
        <div className="rom-loader__game-name animate-fade-in-up">
          <span className="rom-loader__game-name-icon">*</span>
          <span className="rom-loader__game-name-text" title={gameName}>
            {gameName}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="rom-loader__actions">
        <button
          type="button"
          className={`btn btn--primary rom-loader__btn ${isLoading ? '' : ''}`}
          onClick={() => romInputRef.current?.click()}
          disabled={isLoading}
          aria-label="Load a GBA ROM file"
        >
          <span className="rom-loader__btn-icon">[</span>
          {romLoaded ? 'CHANGE ROM' : 'LOAD ROM'}
          <span className="rom-loader__btn-icon">]</span>
        </button>

        <button
          type="button"
          className="btn btn--ghost rom-loader__btn"
          onClick={() => saveInputRef.current?.click()}
          disabled={isLoading}
          aria-label="Load a save file (.sav)"
          title={!romLoaded ? 'Load a ROM first, or stage a save for when the ROM loads' : 'Load save file'}
        >
          <span className="rom-loader__btn-icon">[</span>
          LOAD SAVE
          <span className="rom-loader__btn-icon">]</span>
        </button>
      </div>

      {/* Format hint */}
      <p className="rom-loader__hint">
        Accepts .gba / .gbc / .gb / .sav
      </p>

      <style>{`
        .rom-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          width: 480px;
        }

        .rom-loader__hidden-input {
          display: none;
        }

        .rom-loader__game-name {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background: rgba(105, 255, 71, 0.08);
          border: 1px solid rgba(105, 255, 71, 0.35);
          border-radius: var(--radius-sm);
          padding: var(--space-1) var(--space-3);
          max-width: 100%;
          width: 100%;
        }

        .rom-loader__game-name-icon {
          font-family: var(--font-pixel);
          font-size: 0.55rem;
          color: var(--color-accent-green);
          flex-shrink: 0;
        }

        .rom-loader__game-name-text {
          font-family: var(--font-retro);
          font-size: 1rem;
          color: var(--color-accent-green);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: 0.04em;
        }

        .rom-loader__actions {
          display: flex;
          gap: var(--space-2);
          width: 100%;
        }

        .rom-loader__btn {
          flex: 1;
          padding: var(--space-2) var(--space-3);
          font-size: 0.55rem;
        }

        .rom-loader__btn-icon {
          color: var(--color-accent-cyan);
          opacity: 0.7;
        }

        .rom-loader__hint {
          font-family: var(--font-pixel);
          font-size: 0.35rem;
          color: var(--color-text-muted);
          letter-spacing: 0.08em;
          text-align: center;
        }

        @media (max-width: 768px) {
          .rom-loader {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
