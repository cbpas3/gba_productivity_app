/**
 * Gen III reward action functions.
 *
 * Every function returns a NEW Pokemon object — inputs are never mutated.
 * The pattern is: spread the old Pokemon, override what changed.
 */

import type { Pokemon, EvsConditionSubstructure } from '../../types/pokemon.ts';
import type { IVSet, EvStat } from '../../types/reward.ts';
import { unpackIVs, packIVs } from './ivUtils.ts';
import { getBaseStats, expForLevel, levelFromExp } from './baseStats.ts';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum total EVs across all six stats. */
const MAX_TOTAL_EVS = 510;
/** Maximum EVs for a single stat. */
const MAX_STAT_EVS  = 255;
/** Maximum experience for any Pokemon in Gen III. */
const MAX_EXPERIENCE = 0x00ffffff; // 16 777 215 (technically the real cap is lower per
                                   // growth rate, but this is a safe upper bound that
                                   // keeps the u32 well within bounds)
/** Default PP when teaching a move. */
const DEFAULT_PP = 15;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clampU8(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Sum all six EV values in an EVs substructure. */
function totalEvs(evs: EvsConditionSubstructure): number {
  return evs.hpEv + evs.attackEv + evs.defenseEv + evs.speedEv + evs.spAtkEv + evs.spDefEv;
}

// ─── Reward actions ───────────────────────────────────────────────────────────

/**
 * Give the Pokemon a held item.
 * Returns a new Pokemon with `growth.heldItem` set to `itemId`.
 */
export function giveHeldItem(pokemon: Pokemon, itemId: number): Pokemon {
  return {
    ...pokemon,
    growth: {
      ...pokemon.growth,
      heldItem: itemId & 0xffff,
    },
  };
}

/**
 * Add experience points.
 * The result is capped at MAX_EXPERIENCE.
 */
export function addExperience(pokemon: Pokemon, amount: number): Pokemon {
  const newExp = Math.min(
    MAX_EXPERIENCE,
    (pokemon.growth.experience >>> 0) + Math.max(0, amount),
  );

  return {
    ...pokemon,
    growth: {
      ...pokemon.growth,
      experience: newExp >>> 0,
    },
  };
}

/**
 * Add a percentage of the EXP needed to reach the next level.
 *
 * Calculates the gap between the Pokemon's current EXP and the EXP required
 * for the next level, then grants `percent`% of that gap (floored, minimum 1).
 * At level 100 this is a no-op (already max level).
 *
 * @param pokemon - The Pokemon to modify.
 * @param percent - Percentage of EXP-to-next-level to grant (e.g. 10, 50, 100).
 */
export function addExperiencePercent(pokemon: Pokemon, percent: number): Pokemon {
  const species    = pokemon.growth.species;
  const currentExp = pokemon.growth.experience >>> 0;

  // Species outside the Gen III dex (ROM hacks like Unbound add 400+ more).
  // getBaseStats returns a generic fallback for these, which would produce
  // incorrect growth-rate calculations. Use flat EXP instead so the reward
  // fires correctly without relying on stats we don't have.
  if (species <= 0 || species > 386) {
    console.warn('[addExperiencePercent] Unknown species', species, '— using flat EXP fallback');
    return addExperience(pokemon, Math.max(1, Math.floor(500 * percent / 100)));
  }

  const stats = getBaseStats(species);
  const level = levelFromExp(stats.growthRate, currentExp);

  if (level >= 100) return pokemon;

  const expThisLevel = expForLevel(stats.growthRate, level);
  const expNextLevel = expForLevel(stats.growthRate, level + 1);
  const gap          = expNextLevel - expThisLevel;
  const amount       = Math.max(1, Math.floor(gap * percent / 100));

  return addExperience(pokemon, amount);
}

/**
 * Boost a single EV stat by `amount`.
 *
 * Rules:
 *   - Each stat caps at MAX_STAT_EVS (255).
 *   - The sum of all six stats caps at MAX_TOTAL_EVS (510).
 *   - Excess is silently discarded.
 */
export function boostEvs(pokemon: Pokemon, stat: EvStat, amount: number): Pokemon {
  const evs = { ...pokemon.evs };
  const currentTotal = totalEvs(evs);
  const headroom = MAX_TOTAL_EVS - currentTotal;
  const sanitizedAmount = Math.max(0, Math.min(amount, headroom));

  switch (stat) {
    case 'hp':
      evs.hpEv     = clampU8(evs.hpEv     + sanitizedAmount);
      break;
    case 'atk':
      evs.attackEv  = clampU8(evs.attackEv  + sanitizedAmount);
      break;
    case 'def':
      evs.defenseEv = clampU8(evs.defenseEv + sanitizedAmount);
      break;
    case 'spd':
      evs.speedEv   = clampU8(evs.speedEv   + sanitizedAmount);
      break;
    case 'spatk':
      evs.spAtkEv   = clampU8(evs.spAtkEv   + sanitizedAmount);
      break;
    case 'spdef':
      evs.spDefEv   = clampU8(evs.spDefEv   + sanitizedAmount);
      break;
  }

  return { ...pokemon, evs };
}

/**
 * Set one or more IVs using a partial IVSet.
 *
 * Unspecified IVs are preserved from the original.  The egg and ability flags
 * in `misc.ivsEggAbility` are also preserved.
 */
export function setIVs(pokemon: Pokemon, partialIVs: Partial<IVSet>): Pokemon {
  const { ivs: currentIVs, isEgg, abilitySlot } = unpackIVs(pokemon.misc.ivsEggAbility);

  const mergedIVs: IVSet = {
    hp:    partialIVs.hp    ?? currentIVs.hp,
    atk:   partialIVs.atk   ?? currentIVs.atk,
    def:   partialIVs.def   ?? currentIVs.def,
    spd:   partialIVs.spd   ?? currentIVs.spd,
    spatk: partialIVs.spatk ?? currentIVs.spatk,
    spdef: partialIVs.spdef ?? currentIVs.spdef,
  };

  const newPacked = packIVs(mergedIVs, isEgg, abilitySlot);

  return {
    ...pokemon,
    misc: {
      ...pokemon.misc,
      ivsEggAbility: newPacked,
    },
  };
}

/**
 * Fully heal the Pokemon:
 *   - statusCondition is set to 0 (no status)
 *   - currentHp is restored to maxHp
 */
export function healPokemon(pokemon: Pokemon): Pokemon {
  return {
    ...pokemon,
    statusCondition: 0,
    currentHp:       pokemon.maxHp,
  };
}

/**
 * Teach a move to a specific slot (0–3).
 * Sets `moves[slot]` to `moveId` and `pp[slot]` to DEFAULT_PP (15).
 */
export function teachMove(pokemon: Pokemon, moveId: number, slot: number): Pokemon {
  if (slot < 0 || slot > 3) {
    throw new RangeError(`Move slot must be 0–3, got ${slot}`);
  }

  const moves = [...pokemon.attacks.moves] as [number, number, number, number];
  const pp    = [...pokemon.attacks.pp]    as [number, number, number, number];

  moves[slot] = moveId & 0xffff;
  pp[slot]    = DEFAULT_PP;

  return {
    ...pokemon,
    attacks: { moves, pp },
  };
}
