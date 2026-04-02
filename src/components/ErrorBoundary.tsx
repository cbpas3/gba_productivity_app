import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h1 className="error-boundary__title">SOMETHING WENT WRONG</h1>
            <p className="error-boundary__message">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              className="btn error-boundary__btn"
              onClick={this.handleReload}
            >
              RELOAD APP
            </button>
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: var(--color-bg-base, #1a0a2e);
              padding: 2rem;
            }
            .error-boundary__content {
              text-align: center;
              max-width: 480px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1rem;
            }
            .error-boundary__title {
              font-family: var(--font-pixel, monospace);
              font-size: 0.7rem;
              color: var(--color-accent-red, #ef4444);
              letter-spacing: 0.1em;
            }
            .error-boundary__message {
              font-family: var(--font-retro, monospace);
              font-size: 0.9rem;
              color: var(--color-text-secondary, #a0a0b0);
              line-height: 1.5;
              word-break: break-word;
            }
            .error-boundary__btn {
              padding: 0.5rem 1.5rem;
              font-family: var(--font-pixel, monospace);
              font-size: 0.5rem;
              color: #fff;
              background: var(--color-accent-red, #ef4444);
              border: 2px solid rgba(239, 68, 68, 0.5);
              border-radius: var(--radius-sm, 4px);
              cursor: pointer;
              letter-spacing: 0.08em;
            }
            .error-boundary__btn:hover {
              background: #dc2626;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
