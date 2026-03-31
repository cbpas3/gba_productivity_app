import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Reward } from '../types/reward';

interface RewardHistoryEntry {
  reward: Reward;
  appliedAt: number;
  success: boolean;
}

interface RewardState {
  pendingRewards: Reward[];
  rewardHistory: RewardHistoryEntry[];
  addPending: (reward: Reward) => void;
  markApplied: (reward: Reward, success: boolean) => void;
  clearHistory: () => void;
}

export const useRewardStore = create<RewardState>()(
  persist(
    (set) => ({
      pendingRewards: [],
      rewardHistory: [],

      addPending: (reward) => {
        set((state) => ({
          pendingRewards: [...state.pendingRewards, reward],
        }));
      },

      markApplied: (reward, success) => {
        set((state) => ({
          pendingRewards: state.pendingRewards.filter((r) => r !== reward),
          rewardHistory: [
            { reward, appliedAt: Date.now(), success },
            ...state.rewardHistory,
          ],
        }));
      },

      clearHistory: () => {
        set({ rewardHistory: [] });
      },
    }),
    {
      name: 'gba-rewards',
    }
  )
);
