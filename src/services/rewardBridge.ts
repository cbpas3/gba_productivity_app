/**
 * rewardBridge — wires the application event bus to SaveFileService.
 *
 * Call `initRewardBridge(saveFileService)` once during application bootstrap
 * (after the event bus and save file service are ready). It subscribes to
 * `reward:apply` events, delegates to SaveFileService, and emits
 * `reward:applied` with the outcome so that UI layers can react.
 *
 * The function returns an unsubscribe callback. Call it on teardown (e.g.
 * when the app unmounts or hot-reloads) to prevent duplicate listeners.
 *
 * Dependency notes:
 *   - `eventBus` is provided by Agent A in `src/store/eventBus`.
 *   - `SaveFileService` is defined in this package.
 *   - The EventMap in `src/types/events.ts` guarantees the shapes of the
 *     emitted payloads — no casting needed.
 */

import { eventBus } from '../store/eventBus';
import type { SaveFileService } from './saveFileService';

/**
 * Subscribes to `reward:apply` events and processes them via SaveFileService.
 *
 * @param saveFileService - The application's SaveFileService instance.
 * @returns An unsubscribe function. Call it to stop listening.
 *
 * @example
 * // In application bootstrap (after Agent A's store is ready):
 * const detach = initRewardBridge(saveFileService);
 *
 * // On teardown:
 * detach();
 */
export function initRewardBridge(saveFileService: SaveFileService): () => void {
  const unsub = eventBus.on('reward:apply', async ({ reward }) => {
    console.log('[RewardBridge] reward:apply received', reward.type, 'slot', reward.targetSlot);

    const result = await saveFileService.applyReward(reward);

    if (!result.success) {
      console.error('[RewardBridge] applyReward failed:', result.error);
    } else {
      console.log('[RewardBridge] reward applied successfully');
    }

    eventBus.emit('reward:applied', {
      reward,
      success: result.success,
      error: result.error,
    });
  });

  return unsub;
}
