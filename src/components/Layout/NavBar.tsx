import { useUiStore } from '../../store/uiStore';
import { useRewardStore } from '../../store/rewardStore';
import { useAuthStore } from '../../store/authStore';
import { isSupabaseConfigured } from '../../services/supabaseClient';

export function NavBar() {
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setIsAccountOpen = useUiStore((s) => s.setIsAccountOpen);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const pendingCount = useRewardStore((s) => s.pendingRewards.length);
  const user = useAuthStore((s) => s.user);

  return (
    <nav className="nav-bar" role="navigation" aria-label="Main navigation">
      <div className="nav-bar__inner">
        <button
          className={`nav-bar__tab ${activeTab === 'tasks' ? 'nav-bar__tab--active' : ''}`}
          onClick={() => setActiveTab('tasks')}
          aria-current={activeTab === 'tasks' ? 'page' : undefined}
        >
          <span className="nav-bar__tab-icon">📋</span>
          <span className="nav-bar__tab-label">Tasks</span>
        </button>

        <button
          className={`nav-bar__tab ${activeTab === 'play' ? 'nav-bar__tab--active' : ''}`}
          onClick={() => setActiveTab('play')}
          aria-current={activeTab === 'play' ? 'page' : undefined}
        >
          <span className="nav-bar__tab-icon">🎮</span>
          <span className="nav-bar__tab-label">Play</span>
          {pendingCount > 0 && (
            <span className="nav-bar__badge" aria-label={`${pendingCount} rewards pending`}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          className="nav-bar__tab nav-bar__tab--theme"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
        >
          <span className="nav-bar__tab-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="nav-bar__tab-label">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
        </button>

        {/* Account button — only visible when Supabase is configured */}
        {isSupabaseConfigured && (
          <button
            className={`nav-bar__tab nav-bar__tab--account ${user ? 'nav-bar__tab--synced' : ''}`}
            onClick={() => setIsAccountOpen(true)}
            aria-label={user ? `Account: ${user.email}` : 'Sign in for cloud sync'}
            title={user ? user.email : 'Sign in / Sign up'}
          >
            <span className="nav-bar__tab-icon">{user ? '🔒' : '👤'}</span>
            <span className="nav-bar__tab-label">{user ? 'SYNCED' : 'SIGN IN'}</span>
          </button>
        )}
      </div>

      <style>{`
        /* ── Desktop: top nav bar below header ── */
        .nav-bar {
          background: var(--color-surface-0, #0D0F14);
          border-bottom: 1px solid var(--color-border-subtle);
          position: sticky;
          top: 0;
          z-index: 50;
          flex-shrink: 0;
        }

        .nav-bar__inner {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-2) var(--space-5);
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .nav-bar__tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          cursor: pointer;
          font-family: var(--font-pixel);
          font-size: 0.8rem;
          letter-spacing: 0.05em;
          transition: all var(--transition-fast);
        }

        .nav-bar__tab:hover {
          color: var(--color-text-primary);
          border-color: var(--color-border-subtle);
          background: var(--color-surface-1);
        }

        .nav-bar__tab--active {
          color: var(--color-accent-cyan);
          border-color: var(--color-accent-cyan);
          background: rgba(0, 229, 255, 0.08);
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
        }

        .nav-bar__tab--active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--color-accent-cyan);
          border-radius: 1px;
          box-shadow: 0 0 6px rgba(0, 229, 255, 0.6);
        }

        .nav-bar__tab-icon {
          font-size: 1rem;
          line-height: 1;
        }

        .nav-bar__tab-label {
          font-family: var(--font-pixel);
          font-size: 0.8rem;
        }

        .nav-bar__badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          background: var(--color-accent-yellow, #facc15);
          color: #1a0a2e;
          border-radius: 8px;
          font-family: var(--font-pixel);
          font-size: 0.65rem;
          font-weight: bold;
          line-height: 1;
          animation: badge-pulse 1.4s ease-in-out infinite;
        }

        @keyframes badge-pulse {
          0%, 100% { box-shadow: 0 0 4px rgba(255, 214, 0, 0.4); }
          50%       { box-shadow: 0 0 10px rgba(255, 214, 0, 0.8); }
        }

        /* Theme + Account buttons pushed to the right on desktop */
        .nav-bar__tab--theme {
          margin-left: auto;
          font-size: 0.8rem;
        }

        .nav-bar__tab--account {
          font-size: 0.8rem;
        }

        .nav-bar__tab--synced {
          color: var(--color-accent-green);
          border-color: rgba(105, 255, 71, 0.35);
        }

        .nav-bar__tab--synced:hover {
          border-color: var(--color-accent-green);
        }

        /* ── Mobile: fixed bottom navigation bar ── */
        @media (max-width: 768px) {
          .nav-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            top: auto;
            border-bottom: none;
            border-top: 1px solid var(--color-border-subtle);
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
            z-index: 100;
          }

          .nav-bar__inner {
            padding: var(--space-2) var(--space-3);
            gap: var(--space-2);
            justify-content: space-around;
          }

          .nav-bar__tab {
            flex: 1;
            flex-direction: column;
            justify-content: center;
            gap: 4px;
            padding: var(--space-2) var(--space-1);
            border-radius: var(--radius-md);
          }

          .nav-bar__tab--active::after {
            bottom: auto;
            top: 0;
            height: 2px;
          }

          .nav-bar__tab-icon {
            font-size: 1.3rem;
          }

          .nav-bar__tab-label {
            font-size: 0.72rem;
          }
        }
        /* ── Light mode nav-bar overrides ── */
        [data-theme="light"] .nav-bar {
          background: #FFFFFF;
          border-bottom: 1px solid rgba(15, 23, 42, 0.10);
          box-shadow: none;
        }

        /* Active tab: blue underline + fill */
        [data-theme="light"] .nav-bar__tab--active {
          color: var(--color-purple-main);
          border-color: var(--color-purple-main);
          background: rgba(37, 99, 235, 0.06);
          box-shadow: none;
        }
        [data-theme="light"] .nav-bar__tab--active::after {
          background: var(--color-purple-main);
          box-shadow: none;
        }

        /* Hover state: subtle slate tint */
        [data-theme="light"] .nav-bar__tab:hover {
          background: var(--color-surface-3);
          border-color: rgba(15, 23, 42, 0.12);
          color: var(--color-text-primary);
        }

        /* Synced button */
        [data-theme="light"] .nav-bar__tab--synced {
          color: var(--color-accent-green);
          border-color: rgba(21, 128, 61, 0.3);
        }

        /* Mobile bottom bar: white with top border */
        @media (max-width: 768px) {
          [data-theme="light"] .nav-bar {
            background: rgba(255, 255, 255, 0.97);
            border-top: 1px solid rgba(15, 23, 42, 0.10);
            box-shadow: 0 -2px 12px rgba(15, 23, 42, 0.08);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
        }
      `}</style>
    </nav>
  );
}
