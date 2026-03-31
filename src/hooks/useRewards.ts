import { useEffect } from 'react';
import { useRewardStore } from '../store/rewardStore';
import { eventBus } from '../store/eventBus';

export function useRewards() {
  const store = useRewardStore();

  useEffect(() => {
    const unsub = eventBus.on('reward:applied', ({ reward, success }) => {
      store.markApplied(reward, success);
    });
    return unsub;
  }, []);

  return store;
}
