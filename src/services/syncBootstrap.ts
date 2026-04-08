/**
 * syncBootstrap — pulls cloud state into local Zustand stores after sign-in.
 *
 * Called from App.tsx whenever the Supabase auth state changes to SIGNED_IN.
 * Kept separate to avoid circular imports between the stores.
 */

import { fetchTasks, fetchProfile } from './syncService';
import { useTaskStore } from '../store/taskStore';
import { useRewardStore } from '../store/rewardStore';

export async function hydrateFromCloud(userId: string): Promise<void> {
  try {
    const [tasks, profile] = await Promise.all([
      fetchTasks(userId),
      fetchProfile(userId),
    ]);

    // Cloud always wins on initial pull — replace local tasks.
    if (tasks.length > 0) {
      useTaskStore.getState().hydrateTasks(tasks);
    }

    // Restore pending rewards that were in flight before the last page load.
    if (profile && Array.isArray(profile.pending_exp) && profile.pending_exp.length > 0) {
      useRewardStore.getState().hydratePendingRewards(profile.pending_exp);
    }
  } catch (err) {
    console.error('[syncBootstrap] hydrateFromCloud failed:', err);
  }
}
