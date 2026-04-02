/**
 * rewardBridge — wires the application event bus to SaveFileService.
 *
 * Listens for `rewards:claim` events (triggered when the user clicks
 * "CLAIM REWARDS"), delegates to SaveFileService for batch processing,
 * and emits `rewards:claimed` with the outcome so UI layers can react.
 *
 * Returns an unsubscribe callback for teardown.
 */

import { eventBus } from '../store/eventBus';
import { useRewardStore } from '../store/rewardStore';
import type { SaveFileService } from './saveFileService';

export function initRewardBridge(saveFileService: SaveFileService): () => void {
  const unsub = eventBus.on('rewards:claim', async ({ rewards }) => {
    console.log('[RewardBridge] rewards:claim received,', rewards.length, 'rewards');

    const result = await saveFileService.applyBatchRewards(rewards);

    if (!result.success) {
      console.error('[RewardBridge] applyBatchRewards failed:', result.error);
    } else {
      console.log('[RewardBridge] all rewards applied successfully');
    }

    // Update the store: move pending → history
    useRewardStore.getState().markBatchApplied(rewards, result.success);

    eventBus.emit('rewards:claimed', {
      rewards,
      success: result.success,
      error: result.error,
    });
  });

  return unsub;
}
