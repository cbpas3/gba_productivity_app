/**
 * Application-level service wiring.
 *
 * Call `bootstrapServices()` once at app startup to connect:
 *   - PokemonCryptoService -> SaveFileService
 *   - SaveFileService -> rewardBridge (event bus listener)
 *   - taskStore reward:apply -> addPending (queues reward in UI)
 *
 * Returns a teardown function that unsubscribes all listeners.
 */

import { emulatorService } from './emulatorService';
import { SaveFileService } from './saveFileService';
import { PokemonCryptoService } from './pokemonCrypto';
import { initRewardBridge } from './rewardBridge';
import { eventBus } from '../store/eventBus';
import { useRewardStore } from '../store/rewardStore';

let initialized = false;

export function bootstrapServices(): () => void {
  if (initialized) return () => {};

  const cryptoService = new PokemonCryptoService();
  const saveFileService = new SaveFileService(emulatorService, cryptoService);

  // Wire reward bridge: reward:apply -> save file modification -> reward:applied
  const detachBridge = initRewardBridge(saveFileService);

  // Queue pending rewards in the UI store when reward:apply fires
  const detachPending = eventBus.on('reward:apply', ({ reward }) => {
    useRewardStore.getState().addPending(reward);
  });

  initialized = true;

  return () => {
    detachBridge();
    detachPending();
    initialized = false;
  };
}
