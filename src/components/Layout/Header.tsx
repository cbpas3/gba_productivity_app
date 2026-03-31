import { useEmulatorStore } from '../../store/emulatorStore';
import type { EmulatorStatus } from '../../types/emulator';

const STATUS_LABELS: Record<EmulatorStatus, string> = {
  idle:    'IDLE',
  loading: 'LOADING',
  running: 'RUNNING',
  paused:  'PAUSED',
  error:   'ERROR',
};

export function Header() {
  const status   = useEmulatorStore((s) => s.status);
  const gameName = useEmulatorStore((s) => s.gameName);

  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner">

        {/* Decorative corner ornament */}
        <div className="app-header__ornament app-header__ornament--left" aria-hidden>
          {'>>'}
        </div>

        {/* Title block */}
        <div className="app-header__title-group">
          <h1 className="app-header__title glow-text--cyan">
            GBA Productivity Quest
          </h1>
          <p className="app-header__tagline">
            Complete quests. Earn rewards. Power up your Pokemon.
          </p>
        </div>

        {/* Status block */}
        <div className="app-header__status-group">
          {gameName && (
            <span className="app-header__game-name" title={gameName}>
              {gameName}
            </span>
          )}
          <div className="app-header__status-row">
            <span
              className={`status-dot status-dot--${status}`}
              role="status"
              aria-label={`Emulator status: ${STATUS_LABELS[status]}`}
            />
            <span className="app-header__status-text">
              {STATUS_LABELS[status]}
            </span>
          </div>
        </div>

        {/* Decorative corner ornament */}
        <div className="app-header__ornament app-header__ornament--right" aria-hidden>
          {'<<'}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="app-header__accent-line" aria-hidden />

      <style>{`
        .app-header {
          background: linear-gradient(
            135deg,
            var(--color-purple-deep) 0%,
            var(--color-purple-dark) 40%,
            var(--color-purple-mid) 100%
          );
          border-bottom: 2px solid var(--color-border-bright);
          box-shadow: 0 2px 20px rgba(123, 31, 162, 0.7);
          position: relative;
          z-index: 10;
          flex-shrink: 0;
        }

        .app-header__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          padding: var(--space-3) var(--space-5);
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .app-header__ornament {
          font-family: var(--font-pixel);
          font-size: 0.5rem;
          color: var(--color-purple-glow);
          opacity: 0.5;
          letter-spacing: 0.1em;
          flex-shrink: 0;
        }

        .app-header__title-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-1);
          flex: 1;
          text-align: center;
        }

        .app-header__title {
          font-family: var(--font-pixel);
          font-size: 1rem;
          line-height: 1.4;
          letter-spacing: 0.1em;
          white-space: nowrap;
        }

        .app-header__tagline {
          font-family: var(--font-retro);
          font-size: 1.1rem;
          color: var(--color-text-secondary);
          letter-spacing: 0.08em;
          opacity: 0.85;
        }

        .app-header__status-group {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          flex-shrink: 0;
          min-width: 110px;
        }

        .app-header__game-name {
          font-family: var(--font-retro);
          font-size: 0.9rem;
          color: var(--color-accent-green);
          letter-spacing: 0.04em;
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
        }

        .app-header__status-row {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }

        .app-header__status-text {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-text-muted);
          letter-spacing: 0.1em;
        }

        .app-header__accent-line {
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--color-accent-cyan) 20%,
            var(--color-purple-glow) 50%,
            var(--color-accent-cyan) 80%,
            transparent 100%
          );
          opacity: 0.6;
        }

        @media (max-width: 768px) {
          .app-header__inner {
            padding: var(--space-2) var(--space-3);
            flex-wrap: wrap;
            gap: var(--space-2);
          }
          .app-header__ornament {
            display: none;
          }
          .app-header__title {
            font-size: 0.65rem;
          }
          .app-header__tagline {
            font-size: 0.9rem;
          }
          .app-header__status-group {
            align-items: center;
            width: 100%;
          }
        }
      `}</style>
    </header>
  );
}
