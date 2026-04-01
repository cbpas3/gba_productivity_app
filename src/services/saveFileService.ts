/**
 * SaveFileService — orchestrates reading, modifying, and writing GBA save data.
 *
 * This service sits between the emulator (IEmulatorService) and the Pokemon
 * cryptography layer (IPokemonCryptoService). Agent C will provide a concrete
 * implementation of IPokemonCryptoService; this file only declares the
 * interface contract that implementation must satisfy.
 *
 * Usage:
 *   const svc = new SaveFileService(emulatorService);
 *   svc.setCryptoService(concreteCryptoImpl); // called by Agent C's bootstrap
 *   const result = await svc.applyReward(reward);
 */

import type { Reward } from '../types/reward';
import type { IEmulatorService } from '../types/emulator';

// ---------------------------------------------------------------------------
// IPokemonCryptoService — interface stub for Agent C
// ---------------------------------------------------------------------------

/**
 * Contract for the Gen III Pokemon save-file cryptography service.
 *
 * Agent C provides the concrete implementation. The methods map directly to
 * the operations needed to apply a Reward to a party Pokemon:
 *
 *  parseSaveFile     — decode raw 128 KB save bytes into a structured SaveFile
 *  readPartyPokemon  — decrypt and deserialise a party slot into a Pokemon
 *  applyReward       — mutate a Pokemon according to a Reward descriptor
 *  writePartyPokemon — re-encrypt and serialise the Pokemon back into the save
 *  recalculateSectionChecksum — fix section CRCs after the write
 *
 * `any` is used here intentionally: the full Pokemon / SaveFile types live in
 * src/types/ and Agent C will constrain them in the concrete class. Using
 * structural `any` at the interface boundary keeps this layer decoupled from
 * the crypto implementation details.
 */
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

  /**
   * Injects the concrete Pokemon cryptography implementation.
   * Must be called before `applyReward` can succeed.
   */
  setCryptoService(service: IPokemonCryptoService): void {
    this.cryptoService = service;
  }

  /**
   * Applies a Reward to the party Pokemon in the given slot.
   *
   * Steps:
   *   1. Read current save data from the emulator.
   *   2. Parse the save file structure.
   *   3. Read and decrypt the target party Pokemon.
   *   4. Apply the reward mutation.
   *   5. Re-encrypt and write the Pokemon back into the save buffer.
   *   6. Recalculate all affected section checksums.
   *   7. Write the modified save back to the emulator and trigger a reload.
   *
   * All errors are caught and returned as `{ success: false, error }` so that
   * callers do not need individual try/catch blocks.
   *
   * @param reward - The reward descriptor, including targetSlot (0-5).
   * @returns A result object indicating success or describing the failure.
   */
  async applyReward(reward: Reward): Promise<ApplyRewardResult> {
    if (this.cryptoService === null) {
      return { success: false, error: 'Crypto service not initialized' };
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

      const pokemon = this.cryptoService.readPartyPokemon(saveFile, reward.targetSlot);
      console.log('[SaveFileService] readPartyPokemon slot', reward.targetSlot, '→', pokemon ? `species ${pokemon.growth.species}` : 'null');
      if (pokemon === null || pokemon === undefined) {
        return {
          success: false,
          error: `No Pokemon in party slot ${reward.targetSlot}. Try saving in-game again — early saves may be incomplete.`,
        };
      }

      const modifiedPokemon = this.cryptoService.applyReward(pokemon, reward);
      console.log('[SaveFileService] applyReward OK');

      const modifiedSave = this.cryptoService.writePartyPokemon(
        saveFile,
        reward.targetSlot,
        modifiedPokemon,
      );
      console.log('[SaveFileService] writePartyPokemon OK,', modifiedSave.byteLength, 'bytes');

      const finalSave = this.cryptoService.recalculateSectionChecksum(modifiedSave);

      await this.emulatorService.writeSaveAndReload(finalSave);
      console.log('[SaveFileService] writeSaveAndReload OK');

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
   * Reads the raw save data currently in the emulator without modifying it.
   *
   * Returns null when no game is loaded or no save exists yet. Useful for
   * diagnostic views or manual export.
   */
  getRawSave(): Uint8Array | null {
    return this.emulatorService.getCurrentSave();
  }

  /**
   * Returns whether a crypto service has been injected.
   * Consumers can use this to conditionally enable reward UI.
   */
  isCryptoReady(): boolean {
    return this.cryptoService !== null;
  }
}
