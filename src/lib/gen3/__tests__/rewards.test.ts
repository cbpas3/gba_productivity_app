import { describe, it, expect } from 'vitest';
import {
  giveHeldItem,
  addExperience,
  boostEvs,
  setIVs,
  healPokemon,
  teachMove,
} from '../rewards';
import { unpackIVs } from '../ivUtils';
import type { Pokemon } from '../../../types/pokemon';

// ---------------------------------------------------------------------------
// Base Pokemon fixture
// ---------------------------------------------------------------------------

/** Build a minimal Pokemon for testing. */
function makePokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    personalityValue: 0,
    otId:             0,
    nickname:         new Uint8Array(10),
    language:         1,
    miscFlags:        0,
    otName:           new Uint8Array(7),
    markings:         0,
    growth: {
      species:    25,
      heldItem:   0,
      experience: 100,
      ppBonuses:  0,
      friendship: 70,
    },
    attacks: {
      moves: [33, 0, 0, 0],
      pp:    [35, 0, 0, 0],
    },
    evs: {
      hpEv:       0,
      attackEv:   0,
      defenseEv:  0,
      speedEv:    0,
      spAtkEv:    0,
      spDefEv:    0,
      coolness:   0,
      beauty:     0,
      cuteness:   0,
      smartness:  0,
      toughness:  0,
      feel:       0,
    },
    misc: {
      pokerus:       0,
      metLocation:   0,
      originsInfo:   0,
      ivsEggAbility: 0,
      ribbons:       0,
    },
    statusCondition: 0,
    level:           5,
    currentHp:       20,
    maxHp:           20,
    attack:          12,
    defense:         10,
    speed:           15,
    spAttack:        8,
    spDefense:       8,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// giveHeldItem
// ---------------------------------------------------------------------------

describe('giveHeldItem', () => {
  it('sets the held item on growth substructure', () => {
    const result = giveHeldItem(makePokemon(), 68); // 68 = Rare Candy
    expect(result.growth.heldItem).toBe(68);
  });

  it('overwrites a previously held item', () => {
    const pokemon = makePokemon({ growth: { ...makePokemon().growth, heldItem: 10 } });
    const result  = giveHeldItem(pokemon, 68);
    expect(result.growth.heldItem).toBe(68);
  });

  it('masks itemId to u16', () => {
    const result = giveHeldItem(makePokemon(), 0x1ffff); // should be masked to 0xffff
    expect(result.growth.heldItem).toBe(0xffff);
  });

  it('does not mutate the original Pokemon', () => {
    const original = makePokemon();
    giveHeldItem(original, 68);
    expect(original.growth.heldItem).toBe(0);
  });

  it('preserves all other fields', () => {
    const original = makePokemon();
    const result   = giveHeldItem(original, 68);
    expect(result.growth.species).toBe(original.growth.species);
    expect(result.attacks).toBe(original.attacks);
    expect(result.level).toBe(original.level);
  });
});

// ---------------------------------------------------------------------------
// addExperience
// ---------------------------------------------------------------------------

describe('addExperience', () => {
  it('increases experience by the given amount', () => {
    const pokemon = makePokemon();
    const result  = addExperience(pokemon, 500);
    expect(result.growth.experience).toBe(600);
  });

  it('caps at MAX_EXPERIENCE (0x00FFFFFF = 16777215)', () => {
    const maxExp = 0x00ffffff;
    const pokemon = makePokemon({
      growth: { ...makePokemon().growth, experience: maxExp - 10 },
    });
    const result = addExperience(pokemon, 9999);
    expect(result.growth.experience).toBe(maxExp);
  });

  it('does not allow experience above MAX_EXPERIENCE', () => {
    const maxExp = 0x00ffffff;
    const pokemon = makePokemon({
      growth: { ...makePokemon().growth, experience: maxExp },
    });
    const result = addExperience(pokemon, 1);
    expect(result.growth.experience).toBe(maxExp);
  });

  it('ignores negative amounts (experience never decreases)', () => {
    const pokemon = makePokemon();
    const result  = addExperience(pokemon, -100);
    expect(result.growth.experience).toBe(100); // unchanged
  });

  it('does not mutate the original Pokemon', () => {
    const original = makePokemon();
    addExperience(original, 500);
    expect(original.growth.experience).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// boostEvs
// ---------------------------------------------------------------------------

describe('boostEvs', () => {
  it('adds HP EVs', () => {
    const result = boostEvs(makePokemon(), 'hp', 100);
    expect(result.evs.hpEv).toBe(100);
  });

  it('adds Atk EVs', () => {
    const result = boostEvs(makePokemon(), 'atk', 50);
    expect(result.evs.attackEv).toBe(50);
  });

  it('adds Def EVs', () => {
    const result = boostEvs(makePokemon(), 'def', 50);
    expect(result.evs.defenseEv).toBe(50);
  });

  it('adds Spd EVs', () => {
    const result = boostEvs(makePokemon(), 'spd', 50);
    expect(result.evs.speedEv).toBe(50);
  });

  it('adds SpAtk EVs', () => {
    const result = boostEvs(makePokemon(), 'spatk', 50);
    expect(result.evs.spAtkEv).toBe(50);
  });

  it('adds SpDef EVs', () => {
    const result = boostEvs(makePokemon(), 'spdef', 50);
    expect(result.evs.spDefEv).toBe(50);
  });

  it('enforces 255 per-stat cap', () => {
    const pokemon = makePokemon({ evs: { ...makePokemon().evs, hpEv: 250 } });
    const result  = boostEvs(pokemon, 'hp', 100);
    expect(result.evs.hpEv).toBe(255);
  });

  it('enforces 510 total EV cap across all stats', () => {
    // Start with 500 total (200+200+100+0+0+0).
    const pokemon = makePokemon({
      evs: {
        ...makePokemon().evs,
        hpEv:      200,
        attackEv:  200,
        defenseEv: 100,
      },
    });
    // Try to add 500 more HP EVs — only 10 headroom remains.
    const result = boostEvs(pokemon, 'hp', 500);
    expect(result.evs.hpEv).toBe(210); // 200 + 10
    // Total must not exceed 510.
    const total =
      result.evs.hpEv +
      result.evs.attackEv +
      result.evs.defenseEv +
      result.evs.speedEv +
      result.evs.spAtkEv +
      result.evs.spDefEv;
    expect(total).toBeLessThanOrEqual(510);
  });

  it('does not mutate the original Pokemon', () => {
    const original = makePokemon();
    boostEvs(original, 'hp', 100);
    expect(original.evs.hpEv).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// setIVs
// ---------------------------------------------------------------------------

describe('setIVs', () => {
  it('sets all IVs to 31 when full IVSet provided', () => {
    const result = setIVs(makePokemon(), {
      hp: 31, atk: 31, def: 31, spd: 31, spatk: 31, spdef: 31,
    });
    const { ivs } = unpackIVs(result.misc.ivsEggAbility);
    expect(ivs.hp).toBe(31);
    expect(ivs.atk).toBe(31);
    expect(ivs.def).toBe(31);
    expect(ivs.spd).toBe(31);
    expect(ivs.spatk).toBe(31);
    expect(ivs.spdef).toBe(31);
  });

  it('partial update only changes specified IVs', () => {
    // Start with all IVs = 10 by packing them first.
    const startIvWord =
      (10) | (10 << 5) | (10 << 10) | (10 << 15) | (10 << 20) | (10 << 25);
    const pokemon = makePokemon({
      misc: { ...makePokemon().misc, ivsEggAbility: startIvWord >>> 0 },
    });

    // Only update HP and Atk.
    const result = setIVs(pokemon, { hp: 31, atk: 20 });
    const { ivs } = unpackIVs(result.misc.ivsEggAbility);

    expect(ivs.hp).toBe(31);
    expect(ivs.atk).toBe(20);
    // Others stay at 10.
    expect(ivs.def).toBe(10);
    expect(ivs.spd).toBe(10);
    expect(ivs.spatk).toBe(10);
    expect(ivs.spdef).toBe(10);
  });

  it('preserves egg and ability flags', () => {
    // Pack with egg=true, abilitySlot=true.
    const ivWordWithFlags = (1 << 30) | (1 << 31);
    const pokemon = makePokemon({
      misc: { ...makePokemon().misc, ivsEggAbility: ivWordWithFlags >>> 0 },
    });

    const result = setIVs(pokemon, { hp: 15 });
    const { isEgg, abilitySlot } = unpackIVs(result.misc.ivsEggAbility);

    expect(isEgg).toBe(true);
    expect(abilitySlot).toBe(true);
  });

  it('does not mutate the original Pokemon', () => {
    const original = makePokemon();
    const origWord = original.misc.ivsEggAbility;
    setIVs(original, { hp: 31 });
    expect(original.misc.ivsEggAbility).toBe(origWord);
  });
});

// ---------------------------------------------------------------------------
// healPokemon
// ---------------------------------------------------------------------------

describe('healPokemon', () => {
  it('clears status condition', () => {
    const pokemon = makePokemon({ statusCondition: 5, currentHp: 10, maxHp: 50 });
    const result  = healPokemon(pokemon);
    expect(result.statusCondition).toBe(0);
  });

  it('restores currentHp to maxHp', () => {
    const pokemon = makePokemon({ statusCondition: 5, currentHp: 10, maxHp: 50 });
    const result  = healPokemon(pokemon);
    expect(result.currentHp).toBe(50);
  });

  it('does not change maxHp', () => {
    const pokemon = makePokemon({ currentHp: 1, maxHp: 100 });
    const result  = healPokemon(pokemon);
    expect(result.maxHp).toBe(100);
  });

  it('does not mutate the original Pokemon', () => {
    const original = makePokemon({ statusCondition: 3, currentHp: 1, maxHp: 50 });
    healPokemon(original);
    expect(original.statusCondition).toBe(3);
    expect(original.currentHp).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// teachMove
// ---------------------------------------------------------------------------

describe('teachMove', () => {
  it('teaches move 57 (Surf) to slot 0', () => {
    const result = teachMove(makePokemon(), 57, 0);
    expect(result.attacks.moves[0]).toBe(57);
    expect(result.attacks.pp[0]).toBe(15);
  });

  it('teaches move to slot 1 without affecting other slots', () => {
    const result = teachMove(makePokemon(), 57, 1);
    expect(result.attacks.moves[1]).toBe(57);
    expect(result.attacks.pp[1]).toBe(15);
    // Slot 0 is unchanged.
    expect(result.attacks.moves[0]).toBe(33);
  });

  it('teaches move to slot 3 (last slot)', () => {
    const result = teachMove(makePokemon(), 100, 3);
    expect(result.attacks.moves[3]).toBe(100);
    expect(result.attacks.pp[3]).toBe(15);
  });

  it('throws RangeError for invalid slot (< 0 or > 3)', () => {
    expect(() => teachMove(makePokemon(), 57, -1)).toThrow(RangeError);
    expect(() => teachMove(makePokemon(), 57, 4)).toThrow(RangeError);
  });

  it('does not mutate the original Pokemon', () => {
    const original = makePokemon();
    teachMove(original, 57, 0);
    expect(original.attacks.moves[0]).toBe(33);
  });

  it('preserves other growth/ev/misc fields', () => {
    const original = makePokemon();
    const result   = teachMove(original, 57, 2);
    expect(result.growth).toEqual(original.growth);
    expect(result.evs).toEqual(original.evs);
    expect(result.misc).toEqual(original.misc);
  });
});

// ---------------------------------------------------------------------------
// Immutability guard (cross-cutting)
// ---------------------------------------------------------------------------

describe('immutability: no reward function mutates the original', () => {
  it('giveHeldItem, addExperience, boostEvs, setIVs, healPokemon, teachMove all return new objects', () => {
    const base = makePokemon();

    const r1 = giveHeldItem(base, 68);
    const r2 = addExperience(base, 500);
    const r3 = boostEvs(base, 'hp', 50);
    const r4 = setIVs(base, { hp: 31 });
    const r5 = healPokemon(base);
    const r6 = teachMove(base, 57, 0);

    // Each result is a different object reference.
    expect(r1).not.toBe(base);
    expect(r2).not.toBe(base);
    expect(r3).not.toBe(base);
    expect(r4).not.toBe(base);
    expect(r5).not.toBe(base);
    expect(r6).not.toBe(base);

    // Base is unchanged.
    expect(base.growth.heldItem).toBe(0);
    expect(base.growth.experience).toBe(100);
    expect(base.evs.hpEv).toBe(0);
    expect(base.statusCondition).toBe(0);
    expect(base.currentHp).toBe(20);
    expect(base.attacks.moves[0]).toBe(33);
  });
});
