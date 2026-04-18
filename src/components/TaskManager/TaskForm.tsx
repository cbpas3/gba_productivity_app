import { useState } from 'react';
import type { TaskPriority, TaskRecurrence } from '../../types/task';
import type { Reward } from '../../types/reward';
import { useTaskStore } from '../../store/taskStore';
import { useUiStore } from '../../store/uiStore';
import { ITEM_REWARD_OPTIONS, IV_REWARD_OPTIONS, EV_REWARD_OPTIONS, ALL_REWARD_OPTIONS } from '../../lib/gen3/itemRewards';

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: string }[] = [
  { value: 'low',      label: 'LOW',      icon: '>' },
  { value: 'medium',   label: 'MEDIUM',   icon: '>>' },
  { value: 'high',     label: 'HIGH',     icon: '>>>' },
  { value: 'critical', label: 'CRITICAL', icon: '!!!' },
];

const DEFAULT_REWARD_HINTS: Record<TaskPriority, string> = {
  low:      '10% EXP to next level',
  medium:   '20% EXP to next level',
  high:     '50% EXP to next level',
  critical: '100% EXP to next level',
};

interface TaskFormProps {
  /** Called after a quest is successfully added — useful for closing parent modals. */
  onSubmitSuccess?: () => void;
}

export function TaskForm({ onSubmitSuccess }: TaskFormProps = {}) {
  const addTask = useTaskStore((s) => s.addTask);
  const setIsBulkImportOpen = useUiStore((s) => s.setIsBulkImportOpen);

  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [priority,      setPriority]      = useState<TaskPriority>('medium');
  const [recurrence,    setRecurrence]    = useState<TaskRecurrence>('none');
  const [rewardOverride, setRewardOverride] = useState<string>('default');
  const [submitted,     setSubmitted]     = useState(false);

  const selectedItem = ALL_REWARD_OPTIONS.find((o) => o.id === rewardOverride);
  const customReward: Reward | undefined = selectedItem?.reward;

  const rewardHint = selectedItem
    ? selectedItem.description
    : DEFAULT_REWARD_HINTS[priority];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    addTask(trimmedTitle, description.trim(), priority, recurrence, customReward);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setRecurrence('none');
    setRewardOverride('default');
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onSubmitSuccess?.();
    }, 900);
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
          <option value="repeatable">Repeatable (♾ Resets instantly)</option>
        </select>
      </div>

      <div className="task-form__field">
        <label className="label" htmlFor="task-reward">Reward Item</label>
        <select
          id="task-reward"
          className="input"
          value={rewardOverride}
          onChange={(e) => setRewardOverride(e.target.value)}
        >
          <option value="default">Default (EXP by priority)</option>
          <optgroup label="─── Items ───">
            {ITEM_REWARD_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </optgroup>
          <optgroup label="─── IV Boosts ───">
            {IV_REWARD_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </optgroup>
          <optgroup label="─── EV Boosts ───">
            {EV_REWARD_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="task-form__hint">
        <span className="task-form__hint-icon">*</span>
        Reward: {rewardHint}
      </div>

      <div className="task-form__actions">
        <button
          type="button"
          className="btn btn--secondary task-form__import-btn"
          onClick={() => setIsBulkImportOpen(true)}
          title="Bulk-add multiple quests from a JSON array"
        >
          📥 BULK ADD
        </button>
        <button
          type="submit"
          className={`btn btn--primary task-form__submit ${submitted ? 'task-form__submit--ok' : ''}`}
          disabled={!title.trim()}
        >
          {submitted ? '>> QUEST ADDED! <<' : '[ ADD QUEST ]'}
        </button>
      </div>

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
          font-family: var(--font-ui);
          font-size: 0.8125rem;
          color: var(--color-accent-yellow);
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }
        .task-form__hint-icon {
          color: var(--color-accent-yellow);
        }
        .task-form__actions {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-1);
        }
        .task-form__import-btn {
          flex: 0 0 auto;
          padding: var(--space-3);
        }
        .task-form__submit {
          flex: 1;
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
