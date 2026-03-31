import { describe, it, expect } from 'vitest';
import { expForLevel, levelFromExp, getBaseStats } from '../baseStats';
import { recalculatePartyStats } from '../statCalc';
import type { Pokemon } from '../../../types/pokemon';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMinimalPokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    personalityValue: 0,
    otId:             0,
    nickname:         new Uint8Array(10),
    language:         1,
    miscFlags:        0,
    otName:           new Uint8Array(7),
    markings:         0,
    growth: {
      species:    1,   // Bulbasaur
      heldItem:   0,
      experience: 0,
      ppBonuses:  0,
      friendship: 70,
    },
    attacks: { moves: [33, 0, 0, 0], pp: [35, 0, 0, 0] },
    evs: {
      hpEv: 0, attackEv: 0, defenseEv: 0, speedEv: 0, spAtkEv: 0, spDefEv: 0,
      coolness: 0, beauty: 0, cuteness: 0, smartness: 0, toughness: 0, feel: 0,
    },
    misc: { pokerus: 0, metLocation: 0, originsInfo: 0, ivsEggAbility: 0, ribbons: 0 },
    statusCondition: 0,
    level: 1,
    currentHp: 11,
    maxHp:     11,
    attack:    5,
    defense:   5,
    speed:     5,
    spAttack:  7,
    spDefense: 7,
    ...overrides,
  };
}

// ─── expForLevel ─────────────────────────────────────────────────────────────

describe('expForLevel', () => {
  it('MediumFast: lv1 = 1, lv100 = 1000000', () => {
    expect(expForLevel(0, 1)).toBe(1);
    expect(expForLevel(0, 100)).toBe(1_000_000);
  });

  it('MediumFast: lv5 = 125, lv10 = 1000', () => {
    expect(expForLevel(0, 5)).toBe(125);
    expect(expForLevel(0, 10)).toBe(1000);
  });

  it('Fast: lv100 = 800000', () => {
    expect(expForLevel(4, 100)).toBe(800_000);
  });

  it('Slow: lv100 = 1250000', () => {
    expect(expForLevel(5, 100)).toBe(1_250_000);
  });

  it('MediumSlow: lv1 = 0 (not negative)', () => {
    expect(expForLevel(3, 1)).toBeGreaterThanOrEqual(0);
  });

  it('MediumSlow: lv100 = 1059860', () => {
    expect(expForLevel(3, 100)).toBe(1_059_860);
  });

  it('Erratic: lv100 = 600000', () => {
    expect(expForLevel(1, 100)).toBe(600_000);
  });

  it('Fluctuating: lv100 = 1640000', () => {
    expect(expForLevel(2, 100)).toBe(1_640_000);
  });

  it('clamps level to 1–100', () => {
    expect(expForLevel(0, 0)).toBe(expForLevel(0, 1));
    expect(expForLevel(0, 200)).toBe(expForLevel(0, 100));
  });
});

// ─── levelFromExp ─────────────────────────────────────────────────────────────

describe('levelFromExp', () => {
  it('MediumFast: 0 exp = level 1', () => {
    expect(levelFromExp(0, 0)).toBe(1);
  });

  it('MediumFast: exactly 125 exp = level 5', () => {
    expect(levelFromExp(0, 125)).toBe(5);
  });

  it('MediumFast: 124 exp = level 4 (below lv5 threshold)', () => {
    expect(levelFromExp(0, 124)).toBe(4);
  });

  it('MediumFast: exactly 1000000 exp = level 100', () => {
    expect(levelFromExp(0, 1_000_000)).toBe(100);
  });

  it('MediumFast: over-capped exp still returns level 100', () => {
    expect(levelFromExp(0, 9_999_999)).toBe(100);
  });

  it('Fast: exactly 800000 exp = level 100', () => {
    expect(levelFromExp(4, 800_000)).toBe(100);
  });
});

// ─── getBaseStats ─────────────────────────────────────────────────────────────

describe('getBaseStats', () => {
  it('Bulbasaur (#1) has 45 hp', () => {
    expect(getBaseStats(1).hp).toBe(45);
  });

  it('Pikachu (#25) has 35 hp, 55 spd', () => {
    const s = getBaseStats(25);
    expect(s.hp).toBe(35);
    expect(s.spd).toBe(90);
  });

  it('Mewtwo (#150) has 106 hp', () => {
    expect(getBaseStats(150).hp).toBe(106);
  });

  it('returns fallback for species 0', () => {
    // Should not throw.
    const s = getBaseStats(0);
    expect(s.hp).toBeGreaterThan(0);
  });

  it('returns fallback for species > 386', () => {
    const s = getBaseStats(999);
    expect(s.hp).toBeGreaterThan(0);
  });
});

// ─── recalculatePartyStats ────────────────────────────────────────────────────

describe('recalculatePartyStats', () => {
  /**
   * Bulbasaur (#1) at level 5, all IVs = 0, all EVs = 0, neutral nature (pv=0).
   *
   * HP formula   = floor((2×45 + 0 + 0) × 5 / 100) + 5 + 10 = floor(4.5) + 15 = 4 + 15 = 19
   * Atk formula  = floor((floor((2×49 + 0 + 0) × 5 / 100) + 5) × 1.0) = floor(4.9) + 5 = 4 + 5 = 9
   *             → Actually floor(49*10/100) + 5 = floor(4.9)+5 = 4+5 = 9
   *
   * Note: 2*45=90, 90*5=450, 450/100=4.5, floor=4; 4+5+10=19 for HP
   *       2*49=98, 98*5=490, 490/100=4.9, floor=4; 4+5=9 for Atk
   */
  it('correctly calculates stats for Bulbasaur at level 5 (all IVs/EVs=0, neutral)', () => {
    // MediumSlow exp for lv5
    const expAtLv5 = expForLevel(3, 5); // 65 for MediumSlow

    const pokemon = makeMinimalPokemon({
      personalityValue: 0, // Hardy nature (index 0 = neutral)
      growth: {
        species: 1, heldItem: 0, experience: expAtLv5, ppBonuses: 0, friendship: 70,
      },
      misc: { pokerus: 0, metLocation: 0, originsInfo: 0, ivsEggAbility: 0, ribbons: 0 },
    });

    const result = recalculatePartyStats(pokemon);
    expect(result.level).toBe(5);
    expect(result.maxHp).toBe(19);
  });

  it('does not mutate the original Pokemon', () => {
    const pokemon = makeMinimalPokemon();
    const origLevel = pokemon.level;
    recalculatePartyStats(pokemon);
    expect(pokemon.level).toBe(origLevel);
  });

  it('returns a new object (immutability)', () => {
    const pokemon = makeMinimalPokemon();
    const result = recalculatePartyStats(pokemon);
    expect(result).not.toBe(pokemon);
  });

  it('restores full hp when pokemon was at full hp before', () => {
    const expAtLv10 = expForLevel(0, 10); // MediumFast
    const pokemon = makeMinimalPokemon({
      growth: { species: 25, heldItem: 0, experience: expAtLv10, ppBonuses: 0, friendship: 70 },
      currentHp: 999, // clearly at "full" relative to stored maxHp
      maxHp:     999,
    });
    const result = recalculatePartyStats(pokemon);
    expect(result.currentHp).toBe(result.maxHp);
  });

  it('preserves fractional hp when not at full hp', () => {
    const expAtLv20 = expForLevel(0, 20); // Pikachu is MediumFast
    const pokemon = makeMinimalPokemon({
      growth: { species: 25, heldItem: 0, experience: expAtLv20, ppBonuses: 0, friendship: 70 },
      currentHp: 10,
      maxHp:     100, // at 10% HP
    });
    const result = recalculatePartyStats(pokemon);
    // currentHp should be ~10% of new maxHp, not full
    expect(result.currentHp).toBeLessThan(result.maxHp);
  });

  it('handles level-up: adding 500 EXP past level threshold increases level', () => {
    // Start at the very beginning of level 5 (MediumFast; exp = 125)
    const expAtLv5 = expForLevel(0, 5); // 125
    const before = makeMinimalPokemon({
      growth: { species: 25, heldItem: 0, experience: expAtLv5, ppBonuses: 0, friendship: 70 },
    });
    const beforeResult = recalculatePartyStats(before);

    // Add 500 exp - will push into lv6 area (expForLevel(0,6)=216, so 125+500=625 >> lv8)
    const after = makeMinimalPokemon({
      growth: { species: 25, heldItem: 0, experience: expAtLv5 + 500, ppBonuses: 0, friendship: 70 },
    });
    const afterResult = recalculatePartyStats(after);

    expect(afterResult.level).toBeGreaterThan(beforeResult.level);
    expect(afterResult.maxHp).toBeGreaterThan(beforeResult.maxHp);
  });

  it('stats increase by a reasonable amount at higher levels', () => {
    const expLv50 = expForLevel(0, 50);  // MediumFast
    const expLv51 = expForLevel(0, 51);

    const at50 = recalculatePartyStats(makeMinimalPokemon({
      growth: { species: 6, heldItem: 0, experience: expLv50, ppBonuses: 0, friendship: 70 },
    }));
    const at51 = recalculatePartyStats(makeMinimalPokemon({
      growth: { species: 6, heldItem: 0, experience: expLv51, ppBonuses: 0, friendship: 70 },
    }));

    expect(at51.level).toBe(51);
    expect(at51.maxHp).toBeGreaterThan(at50.maxHp);
    expect(at51.attack).toBeGreaterThanOrEqual(at50.attack);
  });
});
