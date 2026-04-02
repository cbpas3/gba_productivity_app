import { useState } from 'react';
import type { TaskPriority, TaskRecurrence } from '../../types/task';
import { useTaskStore } from '../../store/taskStore';

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: string }[] = [
  { value: 'low',      label: 'LOW',      icon: '>' },
  { value: 'medium',   label: 'MEDIUM',   icon: '>>' },
  { value: 'high',     label: 'HIGH',     icon: '>>>' },
  { value: 'critical', label: 'CRITICAL', icon: '!!!' },
];

const REWARD_HINTS: Record<TaskPriority, string> = {
  low:      'Reward: 10% EXP to next level',
  medium:   'Reward: 20% EXP to next level',
  high:     'Reward: 50% EXP to next level',
  critical: 'Reward: 100% EXP to next level',
};

export function TaskForm() {
  const addTask = useTaskStore((s) => s.addTask);

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [priority,    setPriority]    = useState<TaskPriority>('medium');
  const [recurrence,  setRecurrence]  = useState<TaskRecurrence>('none');
  const [submitted,   setSubmitted]   = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    addTask(trimmedTitle, description.trim(), priority, recurrence);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setRecurrence('none');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 1200);
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      <div className="task-form__header">
        <span className="task-form__icon">+</span>
        <span className="task-form__title">NEW QUEST</span>
      </div>

      <div className="task-form__field">
        <label className="label" htmlFor="task-title">Quest Title</label>
        <input
          id="task-title"
          className="input"
          type="text"
          placeholder="Enter quest name..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          autoComplete="off"
        />
      </div>

      <div className="task-form__field">
        <label className="label" htmlFor="task-desc">Description</label>
        <textarea
          id="task-desc"
          className="input task-form__textarea"
          placeholder="Optional details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={300}
        />
      </div>

      <div className="task-form__field">
        <label className="label" htmlFor="task-priority">Priority / Reward</label>
        <select
          id="task-priority"
          className="input"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.icon} {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="task-form__field">
        <label className="label" htmlFor="task-recurrence">Recurrence</label>
        <select
          id="task-recurrence"
          className="input"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
        >
          <option value="none">None (One-off)</option>
          <option value="daily">Daily Quest (🔁 Resets at midnight)</option>
          <option value="weekly">Weekly Quest (🔁 Resets Monday)</option>
        </select>
      </div>

      <div className="task-form__hint">
        <span className="task-form__hint-icon">*</span>
        {REWARD_HINTS[priority]}
      </div>

      <button
        type="submit"
        className={`btn btn--primary task-form__submit ${submitted ? 'task-form__submit--ok' : ''}`}
        disabled={!title.trim()}
      >
        {submitted ? '>> QUEST ADDED! <<' : '[ ADD QUEST ]'}
      </button>

      <style>{`
        .task-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .task-form__header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .task-form__icon {
          font-family: var(--font-pixel);
          font-size: 0.75rem;
          color: var(--color-accent-cyan);
          text-shadow: var(--glow-text-cyan);
        }
        .task-form__title {
          font-family: var(--font-pixel);
          font-size: 0.6rem;
          color: var(--color-accent-cyan);
          letter-spacing: 0.15em;
          text-shadow: var(--glow-text-cyan);
        }
        .task-form__field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .task-form__textarea {
          resize: vertical;
          min-height: 54px;
          font-size: 1rem;
        }
        .task-form__hint {
          font-family: var(--font-pixel);
          font-size: 0.45rem;
          color: var(--color-accent-yellow);
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }
        .task-form__hint-icon {
          color: var(--color-accent-yellow);
        }
        .task-form__submit {
          margin-top: var(--space-1);
          width: 100%;
          padding: var(--space-3) var(--space-4);
        }
        .task-form__submit--ok {
          background: #1B5E20;
          border-color: var(--color-accent-green);
          color: var(--color-accent-green);
          box-shadow: var(--shadow-green-sm);
        }
      `}</style>
    </form>
  );
}
