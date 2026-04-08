import { useState, useId } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { isSupabaseConfigured } from '../../services/supabaseClient';

type AuthMode = 'signin' | 'signup';

export function AccountModal() {
  const isOpen = useUiStore((s) => s.isAccountOpen);
  const setIsOpen = useUiStore((s) => s.setIsAccountOpen);

  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const emailId = useId();
  const passwordId = useId();

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const err = await signIn(email, password);
        if (err) { setError(err); return; }
        setIsOpen(false);
      } else {
        const err = await signUp(email, password);
        if (err) { setError(err); return; }
        setSuccessMsg('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setIsOpen(false);
  }

  const title = user
    ? 'ACCOUNT'
    : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT';

  return (
    <div
      className="account-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="account-modal card pixel-border pixel-border--glow animate-fade-in-up">
        <div className="account-modal__header">
          <h2 className="account-modal__title glow-text--cyan">{title}</h2>
          <button
            className="account-modal__close btn btn--ghost"
            onClick={() => setIsOpen(false)}
            aria-label="Close account modal"
          >
            ✕
          </button>
        </div>

        <hr className="pixel-divider" />

        {!isSupabaseConfigured && (
          <div className="account-modal__unconfigured">
            <p className="account-modal__notice">
              ⚠ Supabase is not configured.
            </p>
            <p className="account-modal__notice-sub">
              Copy <code>.env.example</code> → <code>.env.local</code> and add
              your project URL and anon key to enable cloud sync.
            </p>
          </div>
        )}

        {isSupabaseConfigured && user && (
          <div className="account-modal__signed-in">
            <div className="account-modal__user-badge">
              <span className="account-modal__user-icon">●</span>
              <span className="account-modal__user-email">{user.email}</span>
            </div>

            <p className="account-modal__sync-note">
              Cloud sync is active. Tasks, rewards, and save files sync automatically.
            </p>

            <button
              className="btn btn--danger account-modal__signout-btn"
              onClick={handleSignOut}
              disabled={isLoading}
            >
              SIGN OUT
            </button>
          </div>
        )}

        {isSupabaseConfigured && !user && (
          <form className="account-modal__form" onSubmit={handleSubmit} noValidate>
            <div className="account-modal__field">
              <label className="label" htmlFor={emailId}>EMAIL</label>
              <input
                id={emailId}
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={submitting}
                placeholder="trainer@example.com"
              />
            </div>

            <div className="account-modal__field">
              <label className="label" htmlFor={passwordId}>PASSWORD</label>
              <input
                id={passwordId}
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                disabled={submitting}
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="account-modal__error" role="alert">{error}</p>
            )}
            {successMsg && (
              <p className="account-modal__success" role="status">{successMsg}</p>
            )}

            <button
              type="submit"
              className="btn btn--primary account-modal__submit-btn"
              disabled={submitting || !email || !password}
            >
              {submitting
                ? '...'
                : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>

            <button
              type="button"
              className="account-modal__toggle-btn"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setSuccessMsg(null);
              }}
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .account-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--space-4);
          box-sizing: border-box;
        }

        .account-modal {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .account-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .account-modal__title {
          font-family: var(--font-pixel);
          font-size: 0.7rem;
          letter-spacing: 0.15em;
        }

        .account-modal__close {
          font-size: 0.9rem;
          padding: var(--space-1) var(--space-2);
          line-height: 1;
        }

        /* ── Unconfigured notice ── */
        .account-modal__unconfigured {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3);
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-sm);
        }

        .account-modal__notice {
          font-family: var(--font-pixel);
          font-size: 0.5rem;
          color: var(--color-accent-red, #ef4444);
          letter-spacing: 0.06em;
        }

        .account-modal__notice-sub {
          font-family: var(--font-retro);
          font-size: 0.95rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
        }

        .account-modal__notice-sub code {
          font-family: var(--font-mono, monospace);
          font-size: 0.85rem;
          background: rgba(255,255,255,0.08);
          padding: 1px 4px;
          border-radius: 3px;
        }

        /* ── Signed-in state ── */
        .account-modal__signed-in {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          align-items: center;
        }

        .account-modal__user-badge {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: rgba(105, 255, 71, 0.08);
          border: 1px solid rgba(105, 255, 71, 0.3);
          border-radius: var(--radius-sm);
          width: 100%;
          box-sizing: border-box;
        }

        .account-modal__user-icon {
          font-size: 0.6rem;
          color: var(--color-accent-green);
          text-shadow: 0 0 6px rgba(105, 255, 71, 0.6);
        }

        .account-modal__user-email {
          font-family: var(--font-retro);
          font-size: 1rem;
          color: var(--color-accent-green);
          word-break: break-all;
        }

        .account-modal__sync-note {
          font-family: var(--font-pixel);
          font-size: 0.38rem;
          color: var(--color-text-muted);
          letter-spacing: 0.06em;
          line-height: 1.8;
          text-align: center;
        }

        .account-modal__signout-btn {
          width: 100%;
          font-family: var(--font-pixel);
          font-size: 0.5rem;
          padding: var(--space-2) var(--space-3);
        }

        /* ── Auth form ── */
        .account-modal__form {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .account-modal__field {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .account-modal__error {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-accent-red, #ef4444);
          letter-spacing: 0.04em;
          line-height: 1.6;
          text-align: center;
        }

        .account-modal__success {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-accent-green);
          letter-spacing: 0.04em;
          line-height: 1.8;
          text-align: center;
        }

        .account-modal__submit-btn {
          width: 100%;
          font-family: var(--font-pixel);
          font-size: 0.5rem;
          padding: var(--space-2) var(--space-3);
          letter-spacing: 0.1em;
        }

        .account-modal__toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font-retro);
          font-size: 0.9rem;
          color: var(--color-accent-cyan);
          text-align: center;
          text-decoration: underline;
          padding: 0;
          opacity: 0.8;
          transition: opacity var(--transition-fast);
        }

        .account-modal__toggle-btn:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
