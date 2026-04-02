import { useState } from 'react';
import type { TaskStatus } from '../../types/task';
import { useTaskStore } from '../../store/taskStore';
import { TaskItem } from './TaskItem';

type FilterType = 'all' | TaskStatus;

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all',       label: 'ALL' },
  { value: 'pending',   label: 'PENDING' },
  { value: 'completed', label: 'DONE' },
];

export function TaskList() {
  const tasks = useTaskStore((s) => s.tasks);
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = tasks.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  // Show pending first, then completed; within each group by createdAt desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
    
    // Group recurring tasks safely at the top of their status bucket
    const aIsRecurring = a.recurrence && a.recurrence !== 'none';
    const bIsRecurring = b.recurrence && b.recurrence !== 'none';
    
    if (aIsRecurring && !bIsRecurring) return -1;
    if (!aIsRecurring && bIsRecurring) return 1;

    return b.createdAt - a.createdAt;
  });

  const pendingCount   = tasks.filter((t) => t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="task-list">
      <div className="task-list__header">
        <div className="task-list__stats">
          <span className="task-list__stat task-list__stat--pending">
            {pendingCount} active
          </span>
          <span className="task-list__stat-sep">/</span>
          <span className="task-list__stat task-list__stat--done">
            {completedCount} cleared
          </span>
        </div>
        <div className="task-list__filters" role="group" aria-label="Task filter">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`task-list__filter-btn ${filter === f.value ? 'task-list__filter-btn--active' : ''}`}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="task-list__items">
        {sorted.length === 0 ? (
          <div className="task-list__empty">
            <div className="task-list__empty-pixel">
              <span>?</span>
            </div>
            <p className="task-list__empty-text">
              {filter === 'completed'
                ? 'NO QUESTS CLEARED YET'
                : 'NO QUESTS FOUND'}
            </p>
            <p className="task-list__empty-sub">
              {filter === 'all' || filter === 'pending'
                ? 'Add a quest above to begin your journey!'
                : ''}
            </p>
          </div>
        ) : (
          sorted.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))
        )}
      </div>

      <style>{`
        .task-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .task-list__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          flex-wrap: wrap;
        }
        .task-list__stats {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-family: var(--font-pixel);
          font-size: 0.45rem;
          letter-spacing: 0.08em;
        }
        .task-list__stat--pending { color: var(--color-accent-yellow); }
        .task-list__stat--done    { color: var(--color-accent-green); }
        .task-list__stat-sep      { color: var(--color-text-muted); }
        .task-list__filters {
          display: flex;
          gap: 4px;
        }
        .task-list__filter-btn {
          background: transparent;
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .task-list__filter-btn:hover {
          border-color: var(--color-border-bright);
          color: var(--color-text-primary);
        }
        .task-list__filter-btn--active {
          background: var(--color-purple-dark);
          border-color: var(--color-purple-glow);
          color: var(--color-text-bright);
          box-shadow: var(--shadow-purple-sm);
        }
        .task-list__items {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          max-height: 420px;
          overflow-y: auto;
          padding-right: 2px;
        }
        .task-list__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-7) var(--space-5);
        }
        .task-list__empty-pixel {
          width: 56px;
          height: 56px;
          border: 3px solid var(--color-border-subtle);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-pixel);
          font-size: 1.5rem;
          color: var(--color-text-muted);
          background: var(--color-surface-1);
        }
        .task-list__empty-text {
          font-family: var(--font-pixel);
          font-size: 0.5rem;
          color: var(--color-text-muted);
          letter-spacing: 0.1em;
          text-align: center;
        }
        .task-list__empty-sub {
          font-family: var(--font-retro);
          font-size: 0.9rem;
          color: var(--color-text-muted);
          opacity: 0.7;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
