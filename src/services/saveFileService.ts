/**
 * SaveFileService — orchestrates reading, modifying, and writing GBA save data.
 *
 * This service sits between the emulator (IEmulatorService) and the Pokemon
 * cryptography layer (IPokemonCryptoService).
 *
 * Usage:
 *   const svc = new SaveFileService(emulatorService);
 *   svc.setCryptoService(concreteCryptoImpl);
 *   const result = await svc.applyBatchRewards(rewards);
 */

import type { Reward } from '../types/reward';
import type { IEmulatorService } from '../types/emulator';

// ---------------------------------------------------------------------------
// IPokemonCryptoService — interface for Agent C's crypto implementation
// ---------------------------------------------------------------------------

export interface IPokemonCryptoService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseSaveFile(data: Uint8Array): any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readPartyPokemon(saveFile: any, slot: number): any | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyReward(pokemon: any, reward: Reward): any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writePartyPokemon(saveFile: any, slot: number, pokemon: any): Uint8Array;

  recalculateSectionChecksum(saveData: Uint8Array): Uint8Array;
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface ApplyRewardResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// SaveFileService
// ---------------------------------------------------------------------------

export class SaveFileService {
  private emulatorService: IEmulatorService;
  private cryptoService: IPokemonCryptoService | null;

  constructor(
    emulatorService: IEmulatorService,
    cryptoService: IPokemonCryptoService | null = null,
  ) {
    this.emulatorService = emulatorService;
    this.cryptoService = cryptoService;
  }

  setCryptoService(service: IPokemonCryptoService): void {
    this.cryptoService = service;
  }

  /**
   * Applies multiple rewards in a single save read/write cycle.
   * Reads the save once, applies all rewards grouped by target slot,
   * writes the modified save once, and triggers a single game reload.
   */
  async applyBatchRewards(rewards: Reward[]): Promise<ApplyRewardResult> {
    if (this.cryptoService === null) {
      return { success: false, error: 'Crypto service not initialized' };
    }

    if (rewards.length === 0) {
      return { success: false, error: 'No rewards to apply' };
    }

    const saveData = this.emulatorService.getCurrentSave();
    console.log('[SaveFileService] getCurrentSave() →', saveData ? `${saveData.byteLength} bytes` : 'null');
    if (saveData === null) {
      return {
        success: false,
        error: 'No save data available. Save in-game first.',
      };
    }

    try {
      const saveFile = this.cryptoService.parseSaveFile(saveData);
      console.log('[SaveFileService] parseSaveFile OK, activeBlock =', saveFile.activeBlock);

      // Group rewards by target slot
      const bySlot = new Map<number, Reward[]>();
      for (const reward of rewards) {
        const slot = reward.targetSlot;
        if (!bySlot.has(slot)) bySlot.set(slot, []);
        bySlot.get(slot)!.push(reward);
      }

      // Apply all rewards per slot, writing each slot back before moving to the next
      let currentSaveData: Uint8Array | null = null;

      for (const [slot, slotRewards] of bySlot) {
        // Re-parse if we've written a previous slot (save bytes changed)
        const currentSave = currentSaveData
          ? this.cryptoService.parseSaveFile(currentSaveData)
          : saveFile;

        let pokemon = this.cryptoService.readPartyPokemon(currentSave, slot);
        console.log('[SaveFileService] readPartyPokemon slot', slot, '→', pokemon ? `species ${pokemon.growth.species}` : 'null');

        if (pokemon === null || pokemon === undefined) {
          return {
            success: false,
            error: `No Pokemon in party slot ${slot}. Try saving in-game again — early saves may be incomplete.`,
          };
        }

        // Apply each reward to this slot's Pokemon sequentially
        for (const reward of slotRewards) {
          pokemon = this.cryptoService.applyReward(pokemon, reward);
          console.log('[SaveFileService] applied', reward.type, 'to slot', slot);
        }

        currentSaveData = this.cryptoService.writePartyPokemon(currentSave, slot, pokemon);
        console.log('[SaveFileService] writePartyPokemon slot', slot, 'OK,', currentSaveData.byteLength, 'bytes');
      }

      const finalSave = this.cryptoService.recalculateSectionChecksum(currentSaveData!);

      await this.emulatorService.writeSaveAndReload(finalSave);
      console.log('[SaveFileService] writeSaveAndReload OK — applied', rewards.length, 'rewards in 1 reload');

      return { success: true };
    } catch (err) {
      console.error('[SaveFileService] Error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Applies a single reward. Kept for backward compatibility.
   */
  async applyReward(reward: Reward): Promise<ApplyRewardResult> {
    return this.applyBatchRewards([reward]);
  }

  getRawSave(): Uint8Array | null {
    return this.emulatorService.getCurrentSave();
  }

  isCryptoReady(): boolean {
    return this.cryptoService !== null;
  }
}
