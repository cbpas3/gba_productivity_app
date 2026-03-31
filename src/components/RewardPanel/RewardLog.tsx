import type { Reward, RewardType } from '../../types/reward';
import { useRewardStore } from '../../store/rewardStore';

const REWARD_LABELS: Record<RewardType, string> = {
  give_item:      'RARE CANDY',
  add_experience: '+EXP',
  boost_evs:      'EV BOOST',
  set_ivs:        'PERFECT IVs',
  heal_pokemon:   'HEAL',
  teach_move:     'MOVE TUTOR',
};

const REWARD_ICONS: Record<RewardType, string> = {
  give_item:      '*',
  add_experience: '+',
  boost_evs:      '^',
  set_ivs:        '!',
  heal_pokemon:   '+',
  teach_move:     '~',
};

const REWARD_COLORS: Record<RewardType, string> = {
  give_item:      'var(--color-accent-yellow)',
  add_experience: 'var(--color-accent-cyan)',
  boost_evs:      'var(--color-accent-green)',
  set_ivs:        'var(--color-priority-critical)',
  heal_pokemon:   'var(--color-accent-green)',
  teach_move:     'var(--color-purple-glow)',
};

function formatRewardDetail(reward: Reward): string {
  const { payload } = reward;
  switch (payload.kind) {
    case 'item':       return `Item #${payload.itemId} -> Slot ${reward.targetSlot + 1}`;
    case 'experience': return `+${payload.amount} EXP -> Slot ${reward.targetSlot + 1}`;
    case 'evs':        return `${payload.stat.toUpperCase()} +${payload.amount} EV`;
    case 'ivs':        return `IVs set -> Slot ${reward.targetSlot + 1}`;
    case 'heal':       return `Healed -> Slot ${reward.targetSlot + 1}`;
    case 'move':       return `Move #${payload.moveId} in slot ${payload.slot + 1}`;
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function RewardLog() {
  const rewardHistory = useRewardStore((s) => s.rewardHistory);
  const clearHistory  = useRewardStore((s) => s.clearHistory);

  const recent = rewardHistory.slice(0, 10);

  return (
    <div className="reward-log">
      <div className="reward-log__header">
        <span className="reward-log__title">REWARD LOG</span>
        {rewardHistory.length > 0 && (
          <button
            className="btn btn--ghost reward-log__clear-btn"
            onClick={clearHistory}
            title="Clear reward history"
          >
            CLEAR
          </button>
        )}
      </div>

      <div className="reward-log__list">
        {recent.length === 0 ? (
          <div className="reward-log__empty">
            <span>-- NO REWARDS YET --</span>
          </div>
        ) : (
          recent.map((entry, i) => (
            <div
              key={`${entry.appliedAt}-${i}`}
              className={`reward-log__entry ${entry.success ? 'reward-log__entry--ok' : 'reward-log__entry--fail'} animate-fade-in-up`}
            >
              <span
                className="reward-log__entry-icon"
                style={{ color: REWARD_COLORS[entry.reward.type] }}
              >
                {REWARD_ICONS[entry.reward.type]}
              </span>
              <div className="reward-log__entry-info">
                <span
                  className="reward-log__entry-type"
                  style={{ color: REWARD_COLORS[entry.reward.type] }}
                >
                  {REWARD_LABELS[entry.reward.type]}
                </span>
                <span className="reward-log__entry-detail">
                  {formatRewardDetail(entry.reward)}
                </span>
              </div>
              <div className="reward-log__entry-right">
                <span className={`reward-log__entry-status ${entry.success ? 'reward-log__entry-status--ok' : 'reward-log__entry-status--fail'}`}>
                  {entry.success ? 'OK' : 'FAIL'}
                </span>
                <span className="reward-log__entry-time">
                  {formatTime(entry.appliedAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .reward-log {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .reward-log__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .reward-log__title {
          font-family: var(--font-pixel);
          font-size: 0.45rem;
          color: var(--color-text-secondary);
          letter-spacing: 0.1em;
        }
        .reward-log__clear-btn {
          padding: 2px 8px;
          font-size: 0.4rem;
        }
        .reward-log__list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 220px;
          overflow-y: auto;
          padding-right: 2px;
        }
        .reward-log__empty {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-text-muted);
          text-align: center;
          padding: var(--space-4);
          letter-spacing: 0.08em;
        }
        .reward-log__entry {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          border-left: 3px solid transparent;
          background: var(--color-surface-1);
          font-size: 0.85rem;
        }
        .reward-log__entry--ok {
          border-left-color: var(--color-accent-green);
        }
        .reward-log__entry--fail {
          border-left-color: var(--color-accent-red);
          opacity: 0.7;
        }
        .reward-log__entry-icon {
          font-family: var(--font-pixel);
          font-size: 0.6rem;
          width: 14px;
          text-align: center;
          flex-shrink: 0;
        }
        .reward-log__entry-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .reward-log__entry-type {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          letter-spacing: 0.06em;
        }
        .reward-log__entry-detail {
          font-family: var(--font-retro);
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .reward-log__entry-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          flex-shrink: 0;
        }
        .reward-log__entry-status {
          font-family: var(--font-pixel);
          font-size: 0.35rem;
          letter-spacing: 0.05em;
        }
        .reward-log__entry-status--ok   { color: var(--color-accent-green); }
        .reward-log__entry-status--fail  { color: var(--color-accent-red); }
        .reward-log__entry-time {
          font-family: var(--font-pixel);
          font-size: 0.35rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
