import type { Reward, RewardType } from '../../types/reward';
import { useRewardStore } from '../../store/rewardStore';
import { RewardLog } from './RewardLog';

const REWARD_ICONS: Record<RewardType, string> = {
  give_item:              '*',
  add_experience:         'E',
  add_experience_percent: '%',
  boost_evs:              'V',
  set_ivs:                '!',
  heal_pokemon:           '+',
  teach_move:             'M',
};

const REWARD_LABELS: Record<RewardType, string> = {
  give_item:              'Rare Candy',
  add_experience:         '+EXP',
  add_experience_percent: '%EXP',
  boost_evs:              'EV Boost',
  set_ivs:                'Perfect IVs',
  heal_pokemon:           'Full Heal',
  teach_move:             'New Move',
};

function getRewardValueShort(reward: Reward): string {
  const { payload } = reward;
  switch (payload.kind) {
    case 'experience_percent': return `${payload.percent}% `;
    case 'experience':         return `+${payload.amount} `;
    case 'evs':                return `+${payload.amount} `;
    default:                   return '';
  }
}

export function RewardDisplay() {
  const pendingRewards = useRewardStore((s) => s.pendingRewards);
  const rewardHistory  = useRewardStore((s) => s.rewardHistory);
  const isClaiming     = useRewardStore((s) => s.isClaiming);
  const claimAll       = useRewardStore((s) => s.claimAll);

  const pendingCount = pendingRewards.length;
  const totalApplied = rewardHistory.filter((r) => r.success).length;

  return (
    <div className="reward-display">
      <div className="reward-display__header">
        <span className="reward-display__icon">*</span>
        <span className="reward-display__title">REWARD CENTER</span>
      </div>

      <div className="reward-display__counters">
        <div className={`reward-display__counter ${pendingCount > 0 ? 'reward-display__counter--pending' : ''}`}>
          <span className="reward-display__counter-value">{pendingCount}</span>
          <span className="reward-display__counter-label">PENDING</span>
        </div>
        <div className="reward-display__counter-sep">//</div>
        <div className="reward-display__counter">
          <span className="reward-display__counter-value reward-display__counter-value--applied">
            {totalApplied}
          </span>
          <span className="reward-display__counter-label">APPLIED</span>
        </div>
        <div className="reward-display__counter-sep">//</div>
        <div className="reward-display__counter">
          <span className="reward-display__counter-value reward-display__counter-value--total">
            {rewardHistory.length}
          </span>
          <span className="reward-display__counter-label">TOTAL</span>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="reward-display__pending-list">
          <p className="reward-display__pending-title">QUEUED REWARDS:</p>
          {pendingRewards.slice(0, 5).map((reward, i) => (
            <div key={i} className="reward-display__pending-item">
              <span className="reward-display__pending-icon">
                {REWARD_ICONS[reward.type]}
              </span>
              <span className="reward-display__pending-label">
                {getRewardValueShort(reward)}{REWARD_LABELS[reward.type]}
              </span>
              <span className="reward-display__pending-slot">
                Slot {reward.targetSlot + 1}
              </span>
            </div>
          ))}
          {pendingCount > 5 && (
            <p className="reward-display__pending-more">
              +{pendingCount - 5} more...
            </p>
          )}

          <div className="reward-display__claim-section">
            <p className="reward-display__claim-warning">
              Save your game first! Claiming will reload the game.
            </p>
            <button
              className="btn reward-display__claim-btn"
              onClick={claimAll}
              disabled={isClaiming}
            >
              {isClaiming ? 'APPLYING...' : `CLAIM ${pendingCount} REWARD${pendingCount !== 1 ? 'S' : ''}`}
            </button>
          </div>
        </div>
      )}

      <hr className="pixel-divider" />

      <RewardLog />

      <style>{`
        .reward-display {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .reward-display__header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .reward-display__icon {
          font-family: var(--font-pixel);
          font-size: 0.75rem;
          color: var(--color-accent-yellow);
          text-shadow: 0 0 8px rgba(255, 214, 0, 0.8);
        }
        .reward-display__title {
          font-family: var(--font-pixel);
          font-size: 0.6rem;
          color: var(--color-accent-yellow);
          letter-spacing: 0.15em;
          text-shadow: 0 0 8px rgba(255, 214, 0, 0.6);
        }
        .reward-display__counters {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          background: var(--color-surface-1);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
        }
        .reward-display__counter {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
        }
        .reward-display__counter--pending .reward-display__counter-value {
          color: var(--color-accent-yellow);
          text-shadow: 0 0 8px rgba(255,214,0,0.7);
          animation: text-pulse-yellow 1.2s ease-in-out infinite;
        }
        .reward-display__counter-value {
          font-family: var(--font-pixel);
          font-size: 1.1rem;
          color: var(--color-text-primary);
          line-height: 1;
        }
        .reward-display__counter-value--applied {
          color: var(--color-accent-green);
        }
        .reward-display__counter-value--total {
          color: var(--color-purple-glow);
        }
        .reward-display__counter-label {
          font-family: var(--font-pixel);
          font-size: 0.35rem;
          color: var(--color-text-muted);
          letter-spacing: 0.08em;
        }
        .reward-display__counter-sep {
          font-family: var(--font-pixel);
          font-size: 0.5rem;
          color: var(--color-border-subtle);
        }
        .reward-display__pending-list {
          background: rgba(255, 214, 0, 0.05);
          border: 1px solid rgba(255, 214, 0, 0.3);
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .reward-display__pending-title {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-accent-yellow);
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }
        .reward-display__pending-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .reward-display__pending-icon {
          font-family: var(--font-pixel);
          font-size: 0.5rem;
          color: var(--color-accent-yellow);
          width: 12px;
        }
        .reward-display__pending-label {
          font-family: var(--font-retro);
          font-size: 1rem;
          color: var(--color-text-primary);
          flex: 1;
        }
        .reward-display__pending-slot {
          font-family: var(--font-pixel);
          font-size: 0.35rem;
          color: var(--color-text-muted);
        }
        .reward-display__pending-more {
          font-family: var(--font-pixel);
          font-size: 0.35rem;
          color: var(--color-text-muted);
          text-align: center;
          margin-top: 4px;
        }
        .reward-display__claim-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          margin-top: var(--space-2);
          padding-top: var(--space-2);
          border-top: 1px solid rgba(255, 214, 0, 0.15);
        }
        .reward-display__claim-warning {
          font-family: var(--font-pixel);
          font-size: 0.35rem;
          color: var(--color-accent-red, #ef4444);
          text-align: center;
          letter-spacing: 0.04em;
          line-height: 1.6;
        }
        .reward-display__claim-btn {
          width: 100%;
          padding: var(--space-2) var(--space-3);
          font-family: var(--font-pixel);
          font-size: 0.5rem;
          letter-spacing: 0.1em;
          color: #1a0a2e;
          background: var(--color-accent-yellow, #facc15);
          border: 2px solid rgba(255, 214, 0, 0.6);
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-shadow: none;
          transition: background var(--transition-normal), transform 0.1s;
        }
        .reward-display__claim-btn:hover:not(:disabled) {
          background: #fde047;
          transform: scale(1.02);
        }
        .reward-display__claim-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .reward-display__claim-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          animation: badge-pulse 1.2s ease-in-out infinite;
        }
        @keyframes text-pulse-yellow {
          0%, 100% { text-shadow: 0 0 4px rgba(255, 214, 0, 0.4); }
          50%      { text-shadow: 0 0 12px rgba(255, 214, 0, 0.9); }
        }
      `}</style>
    </div>
  );
}
