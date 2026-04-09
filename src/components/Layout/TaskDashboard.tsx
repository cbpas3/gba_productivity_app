import React, { useState } from 'react';
import { useRewardStore } from '../../store/rewardStore';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import type { Task, TaskPriority } from '../../types/task';

const PRIORITIES: { id: TaskPriority; label: string; color: string }[] = [
  { id: 'low',      label: 'Low (10%)',      color: 'var(--color-accent-blue)' },
  { id: 'medium',   label: 'Medium (20%)',   color: 'var(--color-accent-green)' },
  { id: 'high',     label: 'High (50%)',     color: 'var(--color-accent-yellow)' },
  { id: 'critical', label: 'Critical (100%)', color: 'var(--color-accent-red)' },
];

// ── Reward Pool Bar ──────────────────────────────────────────────────────────

function RewardPoolBar() {
  const pendingRewards = useRewardStore((s) => s.pendingRewards);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  const totalExpPct = Math.min(
    pendingRewards
      .filter((r) => r.payload.kind === 'experience_percent')
      .reduce((sum, r) => {
        const p = r.payload as { kind: 'experience_percent'; percent: number };
        return sum + p.percent;
      }, 0),
    100
  );

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
          font-family: var(--font-ui);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .reward-pool-bar__pct {
          font-family: var(--font-ui);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-accent-yellow);
          animation: text-pulse-yellow 1.4s ease-in-out infinite;
        }

        .reward-pool-bar__play-btn {
          font-size: 0.8125rem;
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
          font-family: var(--font-ui);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          opacity: 0.8;
        }

        @keyframes text-pulse-yellow {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Kanban Board (inline on homepage) ───────────────────────────────────────

function KanbanBoard() {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTaskPriority = useTaskStore((s) => s.updateTaskPriority);
  const completeTask = useTaskStore((s) => s.completeTask);
  const setIsTaskBoardOpen = useUiStore((s) => s.setIsTaskBoardOpen);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const priorityTasks = tasks.filter(
    (t) =>
      t.status === 'pending' ||
      t.status === 'in-progress' ||
      (t.status === 'completed' && t.recurrence && t.recurrence !== 'none')
  );

  const completedOneOffTasks = tasks.filter(
    (t) => t.status === 'completed' && (!t.recurrence || t.recurrence === 'none')
  );

  function handleDragStart(e: React.DragEvent, task: Task) {
    if (task.status === 'completed') { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', task.id);
    setDraggedTaskId(task.id);
  }
  function handleDragEnd() { setDraggedTaskId(null); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }

  function handleDropPriority(e: React.DragEvent, priority: TaskPriority) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateTaskPriority(id, priority);
    setDraggedTaskId(null);
  }

  function handleDropCompleted(e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      const task = tasks.find((t) => t.id === id);
      if (task && task.status === 'pending') completeTask(id);
    }
    setDraggedTaskId(null);
  }

  return (
    <section className="kanban-board card pixel-border" aria-label="Quest board">
      <header className="kanban-board__header">
        <h2 className="kanban-board__title glow-text--cyan">QUEST BOARD</h2>
        <button
          className="btn btn--primary kanban-board__add-btn"
          onClick={() => setIsTaskBoardOpen(true)}
          aria-label="Add new quest"
        >
          + ADD QUEST
        </button>
      </header>

      <hr className="pixel-divider" />

      <div className="kanban-board__grid">
        {PRIORITIES.map((p) => {
          const colTasks = priorityTasks.filter((t) => t.priority === p.id);
          return (
            <div
              key={p.id}
              className="kanban-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropPriority(e, p.id)}
            >
              <h3 className="kanban-col__title" style={{ borderBottomColor: p.color }}>
                {p.label}
              </h3>
              <div className="kanban-col__list">
                {colTasks.length === 0 && (
                  <p className="kanban-col__empty">Drop here</p>
                )}
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    draggable={t.status !== 'completed'}
                    onDragStart={(e) => handleDragStart(e, t)}
                    onDragEnd={handleDragEnd}
                    className={`kanban-card ${t.status === 'completed' ? 'kanban-card--locked' : ''} ${draggedTaskId === t.id ? 'kanban-card--dragging' : ''}`}
                    style={{ borderLeftColor: p.color }}
                  >
                    <div className="kanban-card__title">{t.title}</div>
                    {t.recurrence && t.recurrence !== 'none' && (
                      <div className="kanban-card__badge">
                        {t.status === 'completed' ? '🔁 LOCKED' : `🔁 ${t.recurrence.toUpperCase()}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Completed column */}
        <div
          className="kanban-col kanban-col--completed"
          onDragOver={handleDragOver}
          onDrop={handleDropCompleted}
        >
          <h3 className="kanban-col__title" style={{ borderBottomColor: 'var(--color-text-muted)' }}>
            Completed
          </h3>
          <div className="kanban-col__list">
            {completedOneOffTasks.length === 0 && (
              <p className="kanban-col__empty">Drop here to complete</p>
            )}
            {completedOneOffTasks.map((t) => (
              <div key={t.id} className="kanban-card kanban-card--completed">
                <div className="kanban-card__title">{t.title}</div>
                <div className="kanban-card__badge">✓ DONE</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .kanban-board {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          width: 100%;
        }

        .kanban-board__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
        }

        .kanban-board__title {
          font-family: var(--font-pixel);
          font-size: 0.6rem;
          letter-spacing: 0.15em;
        }

        .kanban-board__add-btn {
          font-size: 0.8125rem;
          padding: var(--space-2) var(--space-4);
          white-space: nowrap;
        }

        .kanban-board__grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--space-3);
          min-height: 320px;
        }

        /* ── Column ── */
        .kanban-col {
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
          min-height: 200px;
        }

        .kanban-col__title {
          font-family: var(--font-pixel);
          font-size: 0.45rem;
          padding: var(--space-2) var(--space-3);
          background: rgba(0, 0, 0, 0.25);
          border-bottom: 2px solid transparent;
          text-align: center;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kanban-col__list {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-2);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .kanban-col__empty {
          font-family: var(--font-ui);
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-align: center;
          padding: var(--space-4) var(--space-2);
          opacity: 0.5;
          border: 1px dashed var(--color-border-subtle);
          border-radius: var(--radius-sm);
        }

        /* ── Card ── */
        .kanban-card {
          background: var(--color-surface-body);
          border: 1px solid var(--color-border-subtle);
          border-left: 3px solid transparent;
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: grab;
          transition: transform 0.1s, box-shadow 0.1s, opacity 0.1s;
        }
        .kanban-card:hover {
          box-shadow: var(--shadow-purple-sm);
          transform: translateY(-1px);
        }
        .kanban-card:active { cursor: grabbing; }

        .kanban-card--dragging { opacity: 0.45; }

        .kanban-card__title {
          font-family: var(--font-ui);
          font-size: 0.875rem;
          color: var(--color-text-primary);
          word-break: break-word;
          line-height: 1.4;
        }

        .kanban-card__badge {
          font-family: var(--font-pixel);
          font-size: 0.35rem;
          color: var(--color-text-muted);
          background: rgba(0, 0, 0, 0.2);
          padding: 2px 5px;
          border-radius: var(--radius-sm);
          align-self: flex-start;
          letter-spacing: 0.06em;
        }

        .kanban-card--locked {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .kanban-card--locked:active { cursor: not-allowed; }

        .kanban-card--completed {
          opacity: 0.55;
          cursor: default;
          border-left-color: var(--color-text-muted) !important;
        }
        .kanban-card--completed:active { cursor: default; }
        .kanban-card--completed:hover { transform: none; }

        /* Scrollbar */
        .kanban-col__list::-webkit-scrollbar { width: 4px; }
        .kanban-col__list::-webkit-scrollbar-thumb {
          background: var(--color-border-subtle);
          border-radius: 2px;
        }

        /* ── Light theme overrides ── */
        [data-theme="light"] .kanban-col {
          background: var(--color-surface-2);
        }
        [data-theme="light"] .kanban-col__title {
          background: var(--color-surface-3);
        }
        [data-theme="light"] .kanban-card {
          background: var(--color-surface-1);
        }
        [data-theme="light"] .kanban-card__badge {
          background: var(--color-surface-3);
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .kanban-board__grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 600px) {
          .kanban-board__grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </section>
  );
}

// ── TaskDashboard ────────────────────────────────────────────────────────────

export function TaskDashboard() {
  return (
    <div className="task-dashboard">
      <RewardPoolBar />
      <KanbanBoard />

      <style>{`
        .task-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: var(--space-4);
          box-sizing: border-box;
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
