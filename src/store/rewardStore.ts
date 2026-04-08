import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Reward } from '../types/reward';
import { eventBus } from './eventBus';
import * as syncService from '../services/syncService';

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
  /** Replace pending rewards with data pulled from the cloud. */
  hydratePendingRewards: (rewards: Reward[]) => void;
}

// Lazy reference to authStore — resolved at call time to avoid circular imports.
function getUserId(): string | null {
  return (
    (
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./authStore') as { useAuthStore: { getState: () => { user: { id: string } | null } } }
    ).useAuthStore.getState().user?.id ?? null
  );
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

        // Sync updated pending pool to the cloud profile.
        const uid = getUserId();
        if (uid) {
          const pending = get().pendingRewards;
          syncService.pushProfile(uid, pending).catch(console.error);
        }
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

        // Clear pending pool in the cloud now that rewards are applied.
        const uid = getUserId();
        if (uid) {
          syncService.pushProfile(uid, []).catch(console.error);
        }
      },

      clearHistory: () => {
        set({ rewardHistory: [] });
      },

      hydratePendingRewards: (rewards) => {
        set({ pendingRewards: rewards });
      },
    }),
    {
      name: 'gba-rewards',
      onRehydrateStorage: () => {
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
