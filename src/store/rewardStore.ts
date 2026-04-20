import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Reward } from '../types/reward';
import { eventBus } from './eventBus';
import { useAuthStore } from './authStore';
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
  claimSelected: (indices: number[]) => void;
  markBatchApplied: (rewards: Reward[], success: boolean) => void;
  clearHistory: () => void;
  /** Replace pending rewards with data pulled from the cloud. */
  hydratePendingRewards: (rewards: Reward[]) => void;
}

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
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

      claimSelected: (indices) => {
        const { pendingRewards, isClaiming } = get();
        if (indices.length === 0 || isClaiming) return;
        const selected = indices.map((i) => pendingRewards[i]).filter(Boolean) as Reward[];
        if (selected.length === 0) return;
        set({ isClaiming: true });
        eventBus.emit('rewards:claim', { rewards: selected });
      },

      markBatchApplied: (rewards, success) => {
        const now = Date.now();
        const entries: RewardHistoryEntry[] = rewards.map((reward) => ({
          reward,
          appliedAt: now,
          success,
        }));

        set((state) => {
          // Remove only the claimed rewards from pending (first-match per duplicate)
          const remaining = [...state.pendingRewards];
          for (const claimed of rewards) {
            const idx = remaining.findIndex(
              (r) =>
                r.type === claimed.type &&
                r.targetSlot === claimed.targetSlot &&
                JSON.stringify(r.payload) === JSON.stringify(claimed.payload),
            );
            if (idx !== -1) remaining.splice(idx, 1);
          }
          return {
            pendingRewards: remaining,
            isClaiming: false,
            rewardHistory: [...entries, ...state.rewardHistory].slice(0, MAX_HISTORY),
          };
        });

        // Sync updated pending pool to cloud.
        const uid = getUserId();
        if (uid) {
          syncService.pushProfile(uid, get().pendingRewards).catch(console.error);
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
