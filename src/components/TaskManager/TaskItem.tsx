import type { Task, TaskPriority } from '../../types/task';
import { useTaskStore } from '../../store/taskStore';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      'badge--low',
  medium:   'badge--medium',
  high:     'badge--high',
  critical: 'badge--critical',
};

const PRIORITY_REWARDS: Record<TaskPriority, string> = {
  low:      '10% EXP',
  medium:   '20% EXP',
  high:     '50% EXP',
  critical: '100% EXP',
};

const STATUS_LABEL: Record<Task['status'], string> = {
  pending:     'PENDING',
  'in-progress': 'IN PROGRESS',
  completed:   'DONE',
};

interface TaskItemProps {
  task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
  const completeTask = useTaskStore((s) => s.completeTask);
  const deleteTask   = useTaskStore((s) => s.deleteTask);

  const isCompleted = task.status === 'completed';
  const isRecurring = task.recurrence && task.recurrence !== 'none';

  return (
    <div className={`task-item ${isCompleted ? 'task-item--completed' : ''} ${isRecurring ? 'task-item--recurring' : ''} animate-fade-in-up`}>
      <div className="task-item__top">
        <div className="task-item__meta">
          <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          {isRecurring && (
            <span className="badge badge--recurring">
              {task.recurrence === 'daily' ? 'DAILY' : task.recurrence === 'weekly' ? 'WEEKLY' : '♾ REPEAT'}
            </span>
          )}
          <span className="task-item__status">
            {STATUS_LABEL[task.status]}
          </span>
        </div>
        <div className="task-item__actions">
          {!isCompleted && (
            <button
              className="btn btn--success task-item__btn"
              onClick={() => completeTask(task.id)}
              title={`Complete — earns ${PRIORITY_REWARDS[task.priority]}`}
              aria-label={`Complete task: ${task.title}`}
            >
              ✓ DONE
            </button>
          )}
          {isCompleted && isRecurring && task.recurrence !== 'repeatable' && (
            <span className="task-item__reset-label">
              🔁 {task.recurrence === 'daily' ? 'Resets Tomorrow' : 'Resets Next Week'}
            </span>
          )}
          <button
            className="btn btn--danger task-item__btn"
            onClick={() => deleteTask(task.id)}
            title="Delete task"
            aria-label={`Delete task: ${task.title}`}
          >
            ✕
          </button>
        </div>
      </div>

      <h3 className={`task-item__title ${isCompleted ? 'task-item__title--done' : ''}`}>
        {isCompleted && <span className="task-item__checkmark">✓ </span>}
        {task.title}
      </h3>

      {task.description && (
        <p className="task-item__desc">{task.description}</p>
      )}

      <div className="task-item__footer">
        <span className="task-item__reward">
          * Reward: {PRIORITY_REWARDS[task.priority]}
        </span>
        {task.completedAt && (
          <span className="task-item__time">
            {new Date(task.completedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <style>{`
        .task-item {
          background: var(--color-surface-card);
          border: 2px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          transition: border-color var(--transition-normal), opacity var(--transition-normal);
        }
        .task-item:hover {
          border-color: var(--color-border-bright);
          box-shadow: var(--shadow-purple-sm);
        }
        .task-item--completed {
          opacity: 0.65;
          border-color: #2a1a4a;
        }
        .task-item--completed:hover {
          opacity: 0.8;
        }
        .task-item__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }
        .task-item__meta {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .task-item__status {
          font-family: var(--font-ui);
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          letter-spacing: 0.02em;
        }
        .task-item__actions {
          display: flex;
          gap: var(--space-1);
          flex-shrink: 0;
        }
        .task-item__btn {
          padding: 4px 10px;
          font-size: 0.75rem;
        }
        .task-item__title {
          font-family: var(--font-retro);
          font-size: 1.25rem;
          color: var(--color-text-bright);
          word-break: break-word;
        }
        .badge--recurring {
          background: #4527a0;
          color: var(--color-accent-cyan);
          border-color: #651fff;
        }
        .task-item__reset-label {
          font-family: var(--font-ui);
          font-size: 0.6875rem;
          font-weight: 500;
          color: var(--color-accent-blue);
          padding: 3px 8px;
          border: 1px solid rgba(56, 189, 248, 0.4);
          border-radius: var(--radius-sm);
          background: rgba(56, 189, 248, 0.08);
        }
        .task-item__title--done {
          color: var(--color-text-muted);
          text-decoration: line-through;
          text-decoration-color: var(--color-text-muted);
        }
        .task-item__checkmark {
          color: var(--color-accent-green);
        }
        .task-item__desc {
          font-family: var(--font-retro);
          font-size: 1rem;
          color: var(--color-text-secondary);
          word-break: break-word;
        }
        .task-item__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          margin-top: var(--space-1);
        }
        .task-item__reward {
          font-family: var(--font-ui);
          font-size: 0.75rem;
          color: var(--color-accent-yellow);
        }
        .task-item__time {
          font-family: var(--font-ui);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
