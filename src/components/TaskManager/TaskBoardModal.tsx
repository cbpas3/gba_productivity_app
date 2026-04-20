import { useUiStore } from '../../store/uiStore';
import { TaskForm } from './TaskForm';

export function TaskBoardModal() {
  const isOpen = useUiStore((s) => s.isTaskBoardOpen);
  const setIsOpen = useUiStore((s) => s.setIsTaskBoardOpen);

  if (!isOpen) return null;

  return (
    <div className="add-quest-modal">
      <div
        className="add-quest-modal__overlay"
        onClick={() => setIsOpen(false)}
        aria-hidden
      />
      <div
        className="add-quest-modal__content card pixel-border"
        role="dialog"
        aria-modal="true"
        aria-label="Add new quest"
      >
        <header className="add-quest-modal__header">
          <h2 className="glow-text--cyan add-quest-modal__title">ADD QUEST</h2>
          <button
            className="btn btn--ghost add-quest-modal__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <hr className="pixel-divider" />

        <TaskForm />
      </div>

      <style>{`
        .add-quest-modal {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }

        .add-quest-modal__overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        .add-quest-modal__content {
          position: relative;
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-5);
          background: var(--color-surface-card);
          animation: modal-slide-up 0.18s ease forwards;
        }

        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .add-quest-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
        }

        .add-quest-modal__title {
          font-family: var(--font-pixel);
          font-size: 0.7rem;
          letter-spacing: 0.15em;
        }

        .add-quest-modal__close {
          padding: var(--space-1) var(--space-2);
          font-size: 1rem;
          line-height: 1;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }

        @media (max-width: 600px) {
          .add-quest-modal {
            padding: var(--space-2);
            align-items: flex-end;
          }
          .add-quest-modal__content {
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            padding: var(--space-4);
          }
        }
      `}</style>
    </div>
  );
}
