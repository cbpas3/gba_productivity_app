/**
 * Gen III party stat recalculation.
 *
 * The 100-byte party Pokemon structure stores two separate representations of
 * a Pokemon's stats:
 *
 *   1. The encrypted substructures (bytes 0x20-0x4F) — the authoritative data,
 *      containing species, IVs, EVs, experience, moves, etc.
 *
 *   2. The party-only cached stat block (bytes 0x50-0x63) — derived values the
 *      game reads directly: level, currentHp, maxHp, attack, defense, speed,
 *      spAttack, spDefense.
 *
 * When we modify EXP, IVs, or EVs in the substructure we MUST also update the
 * cached stats, otherwise the game shows no change until natural level-up.
 *
 * Gen III stat formulas (all use integer floor):
 *
 *   level = inferred from growth.experience via the species' growth-rate curve
 *
 *   HP   = floor((2×base + iv + floor(ev/4)) × level / 100) + level + 10
 *   stat = floor((floor((2×base + iv + floor(ev/4)) × level / 100) + 5) × nature)
 *
 *   nature: derived from pv % 25, see NATURE_EFFECTS table.
 *           boosts one stat by 1.1, reduces another by 0.9, neutral = 1.0.
 */

import type { Pokemon } from '../../types/pokemon.ts';
import { unpackIVs } from './ivUtils.ts';
import { getBaseStats, levelFromExp } from './baseStats.ts';

// ─── Nature table ─────────────────────────────────────────────────────────────

/**
 * Each nature (indexed by pv % 25) maps to { boosted, reduced } stat indices.
 * Stat indices: 0=atk, 1=def, 2=spd, 3=spatk, 4=spdef
 * Neutral natures have boosted === reduced (no net effect).
 */
const NATURE_EFFECTS: ReadonlyArray<{ boosted: number; reduced: number }> = [
  { boosted: 0, reduced: 0 }, //  0 Hardy    (neutral)
  { boosted: 0, reduced: 1 }, //  1 Lonely   (atk+, def-)
  { boosted: 0, reduced: 2 }, //  2 Brave    (atk+, spd-)
  { boosted: 0, reduced: 3 }, //  3 Adamant  (atk+, spa-)
  { boosted: 0, reduced: 4 }, //  4 Naughty  (atk+, spd-)
  { boosted: 1, reduced: 0 }, //  5 Bold     (def+, atk-)
  { boosted: 1, reduced: 1 }, //  6 Docile   (neutral)
  { boosted: 1, reduced: 2 }, //  7 Relaxed  (def+, spd-)
  { boosted: 1, reduced: 3 }, //  8 Impish   (def+, spa-)
  { boosted: 1, reduced: 4 }, //  9 Lax      (def+, spd-)
  { boosted: 2, reduced: 0 }, // 10 Timid    (spd+, atk-)
  { boosted: 2, reduced: 1 }, // 11 Hasty    (spd+, def-)
  { boosted: 2, reduced: 2 }, // 12 Serious  (neutral)
  { boosted: 2, reduced: 3 }, // 13 Jolly    (spd+, spa-)
  { boosted: 2, reduced: 4 }, // 14 Naive    (spd+, spd-)
  { boosted: 3, reduced: 0 }, // 15 Modest   (spa+, atk-)
  { boosted: 3, reduced: 1 }, // 16 Mild     (spa+, def-)
  { boosted: 3, reduced: 2 }, // 17 Quiet    (spa+, spd-)
  { boosted: 3, reduced: 3 }, // 18 Bashful  (neutral)
  { boosted: 3, reduced: 4 }, // 19 Rash     (spa+, spd-)
  { boosted: 4, reduced: 0 }, // 20 Calm     (spd+, atk-)
  { boosted: 4, reduced: 1 }, // 21 Gentle   (spd+, def-)
  { boosted: 4, reduced: 2 }, // 22 Sassy    (spd+, spd-)
  { boosted: 4, reduced: 3 }, // 23 Careful  (spd+, spa-)
  { boosted: 4, reduced: 4 }, // 24 Quirky   (neutral)
];

/** Returns nature modifier (1.1, 1.0, or 0.9) for a given stat index. */
function natureModifier(pv: number, statIndex: number): number {
  const nature = NATURE_EFFECTS[(pv >>> 0) % 25];
  if (nature.boosted === nature.reduced) return 1.0; // neutral
  if (statIndex === nature.boosted) return 1.1;
  if (statIndex === nature.reduced) return 0.9;
  return 1.0;
}

// ─── Stat formula ─────────────────────────────────────────────────────────────

/** Calculate the HP stat using the Gen III HP formula. */
function calcHp(base: number, iv: number, ev: number, level: number): number {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

/** Calculate a non-HP stat using the Gen III stat formula + nature modifier. */
function calcStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  natureMod: number,
): number {
  const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  // Multiply by nature modifier and floor (Gen III rounds toward zero via floor).
  return Math.floor(raw * natureMod);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Recalculate all party-cached stat fields for a Pokemon.
 *
 * This must be called after any reward that modifies experience, IVs, or EVs
 * so that the in-game display immediately reflects the change.
 *
 * Behaviour:
 *  - Derives the current level from growth.experience and the species growth rate.
 *  - Recalculates maxHp and all battle stats using the Gen III formulas.
 *  - Preserves currentHp proportionally (same fraction of maxHp) unless the
 *    Pokemon was already at full HP, in which case currentHp = new maxHp.
 *  - Returns a new Pokemon object — never mutates the input.
 *
 * @param pokemon - The Pokemon after its substructure has been modified.
 * @returns A new Pokemon with updated level, maxHp, attack, defense, speed,
 *          spAttack, spDefense (and proportionally adjusted currentHp).
 */
export function recalculatePartyStats(pokemon: Pokemon): Pokemon {
  const species = pokemon.growth.species;
  const exp     = pokemon.growth.experience >>> 0;
  const pv      = pokemon.personalityValue >>> 0;

  const stats = getBaseStats(species);
  const level = levelFromExp(stats.growthRate, exp);

  // Unpack IVs from the packed u32.
  const { ivs } = unpackIVs(pokemon.misc.ivsEggAbility);
  const evs      = pokemon.evs;

  // Calculate all six stats.
  const newMaxHp   = calcHp(stats.hp, ivs.hp, evs.hpEv, level);
  const newAtk     = calcStat(stats.atk,   ivs.atk,   evs.attackEv,  level, natureModifier(pv, 0));
  const newDef     = calcStat(stats.def,   ivs.def,   evs.defenseEv, level, natureModifier(pv, 1));
  const newSpd     = calcStat(stats.spd,   ivs.spd,   evs.speedEv,   level, natureModifier(pv, 2));
  const newSpAtk   = calcStat(stats.spatk, ivs.spatk, evs.spAtkEv,   level, natureModifier(pv, 3));
  const newSpDef   = calcStat(stats.spdef, ivs.spdef, evs.spDefEv,   level, natureModifier(pv, 4));

  // Adjust currentHp:
  //   - If at full HP before, stay at full HP after (reward shouldn't drain HP).
  //   - Otherwise preserve the current HP fraction (floored, min 1 if alive).
  const wasFullHp   = pokemon.currentHp >= pokemon.maxHp;
  const newCurrentHp = wasFullHp
    ? newMaxHp
    : Math.max(1, Math.floor(pokemon.currentHp * newMaxHp / Math.max(1, pokemon.maxHp)));

  return {
    ...pokemon,
    level,
    maxHp:     newMaxHp,
    currentHp: newCurrentHp,
    attack:    newAtk,
    defense:   newDef,
    speed:     newSpd,
    spAttack:  newSpAtk,
    spDefense: newSpDef,
  };
}
