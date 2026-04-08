import { useRewardStore } from '../../store/rewardStore';
import { useUiStore } from '../../store/uiStore';
import { TaskForm, TaskList } from '../TaskManager';

function RewardPoolBar() {
  const pendingRewards = useRewardStore((s) => s.pendingRewards);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  // Sum up all experience_percent reward payloads for the EXP bar
  const totalExpPct = Math.min(
    pendingRewards
      .filter((r) => r.payload.kind === 'experience_percent')
      .reduce((sum, r) => {
        const p = r.payload as { kind: 'experience_percent'; percent: number };
        return sum + p.percent;
      }, 0),
    100
  );

  // Fall back to count-based fill (each reward = 10%) when no EXP% rewards
  const fillPct =
    totalExpPct > 0
      ? totalExpPct
      : Math.min(pendingRewards.length * 10, 100);

  const hasRewards = pendingRewards.length > 0;

  return (
    <div className="reward-pool-bar">
      <div className="reward-pool-bar__header">
        <div className="reward-pool-bar__label-group">
          <span className="reward-pool-bar__icon">★</span>
          <span className="reward-pool-bar__title">UNCLAIMED REWARD POOL</span>
          <span className="reward-pool-bar__pct">
            {totalExpPct > 0 ? `EXP: ${totalExpPct}%` : `${pendingRewards.length} PENDING`}
          </span>
        </div>

        {hasRewards && (
          <button
            className="btn btn--primary reward-pool-bar__play-btn"
            onClick={() => setActiveTab('play')}
          >
            🎮 Ready to Play?
          </button>
        )}
      </div>

      <div className="reward-pool-bar__track" role="progressbar" aria-valuenow={fillPct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`reward-pool-bar__fill ${hasRewards ? 'reward-pool-bar__fill--active' : ''}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>

      {!hasRewards && (
        <p className="reward-pool-bar__hint">Complete quests to fill the reward pool.</p>
      )}

      <style>{`
        .reward-pool-bar {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--color-surface-1);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
        }

        .reward-pool-bar__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          flex-wrap: wrap;
        }

        .reward-pool-bar__label-group {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .reward-pool-bar__icon {
          font-family: var(--font-pixel);
          font-size: 0.65rem;
          color: var(--color-accent-yellow);
          text-shadow: 0 0 8px rgba(255, 214, 0, 0.7);
        }

        .reward-pool-bar__title {
          font-family: var(--font-pixel);
          font-size: 0.45rem;
          color: var(--color-text-muted);
          letter-spacing: 0.1em;
        }

        .reward-pool-bar__pct {
          font-family: var(--font-pixel);
          font-size: 0.5rem;
          color: var(--color-accent-yellow);
          text-shadow: 0 0 6px rgba(255, 214, 0, 0.5);
          animation: text-pulse-yellow 1.4s ease-in-out infinite;
        }

        .reward-pool-bar__play-btn {
          font-size: 0.45rem;
          padding: var(--space-1) var(--space-3);
          white-space: nowrap;
        }

        .reward-pool-bar__track {
          height: 8px;
          background: var(--color-surface-0, #0D0F14);
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid var(--color-border-subtle);
        }

        .reward-pool-bar__fill {
          height: 100%;
          background: var(--color-border-subtle);
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .reward-pool-bar__fill--active {
          background: linear-gradient(
            90deg,
            var(--color-purple-glow),
            var(--color-accent-cyan)
          );
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
        }

        .reward-pool-bar__hint {
          font-family: var(--font-pixel);
          font-size: 0.35rem;
          color: var(--color-text-muted);
          letter-spacing: 0.06em;
          opacity: 0.6;
        }

        @keyframes text-pulse-yellow {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function TaskDashboard() {
  return (
    <div className="task-dashboard">
      <RewardPoolBar />

      <section
        className="task-dashboard__section card pixel-border"
        aria-label="Quest manager"
      >
        <h2 className="task-dashboard__section-title glow-text--cyan">
          QUEST LOG
        </h2>
        <hr className="pixel-divider" />
        <TaskForm />
        <hr className="pixel-divider" />
        <TaskList />
      </section>

      <style>{`
        .task-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          max-width: 720px;
          margin: 0 auto;
          width: 100%;
          padding: var(--space-4);
          box-sizing: border-box;
        }

        .task-dashboard__section {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .task-dashboard__section-title {
          font-family: var(--font-pixel);
          font-size: 0.6rem;
          letter-spacing: 0.15em;
        }

        @media (max-width: 768px) {
          .task-dashboard {
            padding: var(--space-2);
            gap: var(--space-3);
          }
        }
      `}</style>
    </div>
  );
}
