/**
 * Application-level service wiring.
 *
 * Call `bootstrapServices()` once at app startup to connect:
 *   - PokemonCryptoService -> SaveFileService
 *   - SaveFileService -> rewardBridge (event bus listener for rewards:claim)
 *
 * Task completion pools rewards in the rewardStore directly (no event bus).
 * The rewardBridge only fires when the user clicks "CLAIM REWARDS".
 *
 * Returns a teardown function that unsubscribes all listeners.
 */

import { emulatorService } from './emulatorService';
import { SaveFileService } from './saveFileService';
import { PokemonCryptoService } from './pokemonCrypto';
import { initRewardBridge } from './rewardBridge';

let initialized = false;

export function bootstrapServices(): () => void {
  if (initialized) return () => {};

  const cryptoService = new PokemonCryptoService();
  const saveFileService = new SaveFileService(emulatorService, cryptoService);

  // Wire reward bridge: rewards:claim -> batch save modification -> rewards:claimed
  const detachBridge = initRewardBridge(saveFileService);

  initialized = true;

  return () => {
    detachBridge();
    initialized = false;
  };
}
