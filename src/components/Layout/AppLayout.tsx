import { useEffect } from 'react';
import { Header } from './Header';
import { NavBar } from './NavBar';
import { TaskDashboard } from './TaskDashboard';
import { PlayRoom } from './PlayRoom';
import { TutorialModal } from '../TutorialModal';
import { TaskBoardModal, BulkImportModal } from '../TaskManager';
import { AccountModal } from '../Auth';
import { GamepadMapperModal } from '../GamepadMapper';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';

export function AppLayout() {
  const activeTab = useUiStore((s) => s.activeTab);
  const resetRecurringTasks = useTaskStore((s) => s.resetRecurringTasks);

  useEffect(() => {
    resetRecurringTasks();
    const handleFocus = () => resetRecurringTasks();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [resetRecurringTasks]);

  return (
    <div className="app-layout">
      <Header />
      <NavBar />

      <main className="app-layout__main" role="main">
        {/*
          Both views are always mounted so the mGBA emulator canvas is never
          destroyed when the user switches tabs. We toggle visibility via CSS
          (display: none) instead of conditional rendering to preserve game state.
        */}
        <div
          className="app-layout__view"
          aria-hidden={activeTab !== 'tasks'}
          style={{ display: activeTab === 'tasks' ? 'block' : 'none' }}
        >
          <TaskDashboard />
        </div>

        <div
          className="app-layout__view"
          aria-hidden={activeTab !== 'play'}
          style={{ display: activeTab === 'play' ? 'block' : 'none' }}
        >
          <PlayRoom />
        </div>
      </main>

      <footer className="app-layout__footer" role="contentinfo">
        <p className="app-layout__footer-text">
          Emulation powered by{' '}
          <a
            href="https://mgba.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="app-layout__footer-link"
          >
            mGBA
          </a>{' '}
          (Mozilla Public License 2.0) via{' '}
          <a
            href="https://github.com/thenick775/mgba-wasm"
            target="_blank"
            rel="noopener noreferrer"
            className="app-layout__footer-link"
          >
            mgba-wasm
          </a>
          . Fonts: Press Start 2P by Christian Robertson &amp; VT323 by Peter
          Hull (SIL Open Font License 1.1). Game Boy Advance is a trademark of
          Nintendo Co., Ltd. This app is not affiliated with or endorsed by
          Nintendo.
        </p>
      </footer>

      <TutorialModal />
      <TaskBoardModal />
      <BulkImportModal />
      <AccountModal />
      <GamepadMapperModal />

      <style>{`
        .app-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .app-layout__main {
          flex: 1;
          width: 100%;
          box-sizing: border-box;
        }

        .app-layout__view {
          width: 100%;
        }

        /* ── Footer ── */
        .app-layout__footer {
          padding: var(--space-3) var(--space-5);
          border-top: 1px solid rgba(123, 31, 162, 0.3);
          text-align: center;
        }

        .app-layout__footer-text {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-text-muted);
          opacity: 0.5;
          letter-spacing: 0.06em;
          line-height: 2;
        }

        .app-layout__footer-link {
          color: var(--color-accent-cyan);
          text-decoration: none;
          opacity: 0.8;
        }

        .app-layout__footer-link:hover {
          opacity: 1;
          text-decoration: underline;
        }

        /* ── Mobile: extra bottom padding so fixed NavBar doesn't overlap content ── */
        @media (max-width: 768px) {
          .app-layout__main {
            padding-bottom: 72px;
          }
        }
      `}</style>
    </div>
  );
}
