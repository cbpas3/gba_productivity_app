import { useRef, useEffect } from 'react';
import { Header } from './Header';
import { TaskForm, TaskList } from '../TaskManager';
import { RewardDisplay } from '../RewardPanel';
import { EmulatorCanvas, GbaControls, RomLoader } from '../EmulatorView';
import { emulatorService } from '../../services/emulatorService';
import { useEmulatorStore } from '../../store/emulatorStore';

export function AppLayout() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const initialized = useRef(false);
  const setStatus   = useEmulatorStore((s) => s.setStatus);
  const setError    = useEmulatorStore((s) => s.setError);

  useEffect(() => {
    if (initialized.current) return;
    if (!canvasRef.current) return;
    initialized.current = true;

    const canvas = canvasRef.current;

    setStatus('loading');

    emulatorService.initialize(canvas)
      .then(() => {
        setStatus('idle');
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      });
  }, [setStatus, setError]);

  return (
    <div className="app-layout">
      <Header />

      <main className="app-layout__main" role="main">

        {/* ── Left panel: Tasks + Rewards ── */}
        <aside className="app-layout__left-panel" aria-label="Quest and reward management">

          <section className="app-layout__section card pixel-border" aria-label="Quest manager">
            <h2 className="app-layout__section-title glow-text--cyan">
              QUEST LOG
            </h2>
            <hr className="pixel-divider" />
            <TaskForm />
            <hr className="pixel-divider" />
            <TaskList />
          </section>

          <section className="app-layout__section card pixel-border" aria-label="Reward center">
            <h2 className="app-layout__section-title glow-text--purple">
              REWARD CENTER
            </h2>
            <hr className="pixel-divider" />
            <RewardDisplay />
          </section>

        </aside>

        {/* ── Right panel: Emulator ── */}
        <section className="app-layout__right-panel" aria-label="GBA emulator">
          <div className="app-layout__emulator-wrap card pixel-border">
            <h2 className="app-layout__section-title glow-text--purple">
              EMULATOR
            </h2>
            <hr className="pixel-divider" />

            <div className="app-layout__emulator-inner">
              <EmulatorCanvas ref={canvasRef} />
              <GbaControls />
              <RomLoader />
            </div>
          </div>
        </section>

      </main>

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

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .app-layout__main {
            flex-direction: column;
            padding: var(--space-3);
            gap: var(--space-3);
            max-height: none;
          }

          .app-layout__left-panel,
          .app-layout__right-panel {
            flex: none;
            max-width: 100%;
            width: 100%;
          }

          .app-layout__left-panel {
            max-height: none;
            overflow-y: visible;
            padding-right: 0;
          }
        }
      `}</style>
    </div>
  );
}
