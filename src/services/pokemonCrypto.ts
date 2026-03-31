import type { Pokemon } from '../types/pokemon';
import type { SaveFile } from '../types/savefile';
import type { Reward } from '../types/reward';
import { parseSaveFile, getPartyPokemon, setPartyPokemon } from '../lib/gen3/saveFileParser';
import { giveHeldItem, addExperience, addExperiencePercent, boostEvs, setIVs, healPokemon, teachMove } from '../lib/gen3/rewards';
import { recalculatePartyStats } from '../lib/gen3/statCalc';

export class PokemonCryptoService {
  parseSaveFile(data: Uint8Array): SaveFile {
    return parseSaveFile(data);
  }

  readPartyPokemon(saveFile: SaveFile, slot: number): Pokemon | null {
    const party = getPartyPokemon(saveFile);
    return party[slot] ?? null;
  }

  applyReward(pokemon: Pokemon, reward: Reward): Pokemon {
    let result: Pokemon;

    switch (reward.type) {
      case 'give_item': {
        const p = reward.payload;
        if (p.kind !== 'item') throw new Error('Invalid payload for give_item');
        result = giveHeldItem(pokemon, p.itemId);
        break;
      }
      case 'add_experience': {
        const p = reward.payload;
        if (p.kind !== 'experience') throw new Error('Invalid payload for add_experience');
        result = addExperience(pokemon, p.amount);
        break;
      }
      case 'add_experience_percent': {
        const p = reward.payload;
        if (p.kind !== 'experience_percent') throw new Error('Invalid payload for add_experience_percent');
        result = addExperiencePercent(pokemon, p.percent);
        break;
      }
      case 'boost_evs': {
        const p = reward.payload;
        if (p.kind !== 'evs') throw new Error('Invalid payload for boost_evs');
        result = boostEvs(pokemon, p.stat, p.amount);
        break;
      }
      case 'set_ivs': {
        const p = reward.payload;
        if (p.kind !== 'ivs') throw new Error('Invalid payload for set_ivs');
        result = setIVs(pokemon, p.values);
        break;
      }
      case 'heal_pokemon':
        result = healPokemon(pokemon);
        break;
      case 'teach_move': {
        const p = reward.payload;
        if (p.kind !== 'move') throw new Error('Invalid payload for teach_move');
        result = teachMove(pokemon, p.moveId, p.slot);
        break;
      }
      default:
        throw new Error(`Unknown reward type: ${reward.type}`);
    }

    // Recalculate party-cached stats (level, maxHp, attack, etc.) after any
    // reward that affects the stat formula inputs.
    const needsStatRecalc =
      reward.type === 'add_experience'         ||
      reward.type === 'add_experience_percent' ||
      reward.type === 'set_ivs'                ||
      reward.type === 'boost_evs';

    return needsStatRecalc ? recalculatePartyStats(result) : result;
  }

  writePartyPokemon(saveFile: SaveFile, slot: number, pokemon: Pokemon): Uint8Array {
    return setPartyPokemon(saveFile, slot, pokemon);
  }

  recalculateSectionChecksum(saveData: Uint8Array): Uint8Array {
    // setPartyPokemon already recalculates the section checksum internally,
    // so this is a pass-through. But we keep it as a safety net.
    return saveData;
  }
}
