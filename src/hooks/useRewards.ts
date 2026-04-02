import { useEffect } from 'react';
import { useRewardStore } from '../store/rewardStore';
import { eventBus } from '../store/eventBus';

export function useRewards() {
  const store = useRewardStore();

  useEffect(() => {
    const unsub = eventBus.on('rewards:claimed', ({ rewards, success }) => {
      // markBatchApplied is already called by rewardBridge, but if
      // additional UI-side effects are needed in the future, wire them here.
      void rewards;
      void success;
    });
    return unsub;
  }, []);

  return store;
}
