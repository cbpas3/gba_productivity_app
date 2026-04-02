import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Reward } from '../types/reward';
import { eventBus } from './eventBus';

interface RewardHistoryEntry {
  reward: Reward;
  appliedAt: number;
  success: boolean;
}

interface RewardState {
  pendingRewards: Reward[];
  rewardHistory: RewardHistoryEntry[];
  isClaiming: boolean;
  addPending: (reward: Reward) => void;
  claimAll: () => void;
  markBatchApplied: (rewards: Reward[], success: boolean) => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 100;

export const useRewardStore = create<RewardState>()(
  persist(
    (set, get) => ({
      pendingRewards: [],
      rewardHistory: [],
      isClaiming: false,

      addPending: (reward) => {
        set((state) => ({
          pendingRewards: [...state.pendingRewards, reward],
        }));
      },

      claimAll: () => {
        const { pendingRewards, isClaiming } = get();
        if (pendingRewards.length === 0 || isClaiming) return;

        set({ isClaiming: true });
        eventBus.emit('rewards:claim', { rewards: [...pendingRewards] });
      },

      markBatchApplied: (rewards, success) => {
        const now = Date.now();
        const entries: RewardHistoryEntry[] = rewards.map((reward) => ({
          reward,
          appliedAt: now,
          success,
        }));

        set((state) => ({
          pendingRewards: [],
          isClaiming: false,
          rewardHistory: [...entries, ...state.rewardHistory].slice(0, MAX_HISTORY),
        }));
      },

      clearHistory: () => {
        set({ rewardHistory: [] });
      },
    }),
    {
      name: 'gba-rewards',
      onRehydrateStorage: () => {
        // Clear stale pending rewards on page load — any reward that was
        // "pending" before a refresh is unrecoverable (the pipeline was
        // interrupted). Return a post-hydration callback.
        return (state?: RewardState) => {
          if (state && state.pendingRewards.length > 0) {
            state.pendingRewards = [];
            state.isClaiming = false;
          }
        };
      },
    }
  )
);
