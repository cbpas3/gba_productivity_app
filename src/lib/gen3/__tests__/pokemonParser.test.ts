import { describe, it, expect } from 'vitest';
import { readPokemon, writePokemon } from '../pokemonParser';
import { unpackIVs } from '../ivUtils';

// ---------------------------------------------------------------------------
// Synthetic Pikachu builder
//
// Layout notes (PV = 0, OTID = 0):
//   - key = PV ^ OTID = 0 → encrypted block = decrypted block (XOR identity)
//   - order = PV % 24 = 0 → GAEM
//   - 48-byte block = Growth(12) ++ Attacks(12) ++ EVs(12) ++ Misc(12)
// ---------------------------------------------------------------------------

/**
 * Build a valid 100-byte party Pokemon buffer for a level-5 Pikachu.
 *
 * PV=0, OTID=0 means key=0 and order=GAEM.  The encrypted block is identical
 * to the decrypted block so we can construct it without calling the crypto
 * functions, keeping the test independent.
 */
function buildPikachuBuffer(): Uint8Array {
  const buf  = new Uint8Array(100);
  const view = new DataView(buf.buffer);

  // ── Header ──────────────────────────────────────────────────────────────
  // 0x00 PV  = 0 (already zero)
  // 0x04 OTID = 0 (already zero)
  // 0x08 Nickname: 10 zero bytes
  // 0x12 Language = 1
  view.setUint8(0x12, 1);
  // 0x13 miscFlags = 0
  // 0x14 OT Name: 7 zero bytes
  // 0x1B markings = 0

  // ── Growth substructure (12 bytes, GAEM position 0 → bytes 0–11 of block) ─
  const growth = new Uint8Array(12);
  const gv     = new DataView(growth.buffer);
  gv.setUint16(0, 25,   true); // species = 25 (Pikachu)
  gv.setUint16(2, 0,    true); // heldItem = 0
  gv.setUint32(4, 1000, true); // experience = 1000
  gv.setUint8 (8, 0);          // ppBonuses = 0
  gv.setUint8 (9, 70);         // friendship = 70

  // ── Attacks substructure (12 bytes, GAEM position 1 → bytes 12–23 of block) ─
  const attacks = new Uint8Array(12);
  const av      = new DataView(attacks.buffer);
  av.setUint16(0, 33, true); // moves[0] = 33 (Tackle)
  av.setUint16(2, 0,  true); // moves[1] = 0
  av.setUint16(4, 0,  true); // moves[2] = 0
  av.setUint16(6, 0,  true); // moves[3] = 0
  av.setUint8 (8, 35);       // pp[0] = 35
  av.setUint8 (9, 0);
  av.setUint8 (10, 0);
  av.setUint8 (11, 0);

  // ── EVs substructure (12 zeros, GAEM position 2 → bytes 24–35 of block) ─
  const evs = new Uint8Array(12); // all zeros

  // ── Misc substructure (12 bytes, GAEM position 3 → bytes 36–47 of block) ─
  // IVs all 15, egg=false, ability=false
  // ivWord = 15 | (15<<5) | (15<<10) | (15<<15) | (15<<20) | (15<<25) = 0x1EF7BDEF
  const ivWord = (15 | (15 << 5) | (15 << 10) | (15 << 15) | (15 << 20) | (15 << 25)) >>> 0;
  const misc   = new Uint8Array(12);
  const mv     = new DataView(misc.buffer);
  mv.setUint8 (0, 0); // pokerus = 0
  mv.setUint8 (1, 0); // metLocation = 0
  mv.setUint16(2, 0, true); // originsInfo = 0
  mv.setUint32(4, ivWord, true); // ivsEggAbility
  mv.setUint32(8, 0, true); // ribbons = 0

  // ── Assemble the 48-byte GAEM block ─────────────────────────────────────
  const block = new Uint8Array(48);
  block.set(growth,  0);
  block.set(attacks, 12);
  block.set(evs,     24);
  block.set(misc,    36);

  // ── Checksum (over the 48-byte decrypted block) ──────────────────────────
  let sum = 0;
  const bv = new DataView(block.buffer);
  for (let i = 0; i < 24; i++) sum += bv.getUint16(i * 2, true);
  const checksum = sum & 0xffff;

  view.setUint16(0x1c, checksum, true); // write at 0x1C

  // ── Encrypted block at 0x20 (key=0 → identity) ──────────────────────────
  buf.set(block, 0x20);

  // ── Party-only fields ────────────────────────────────────────────────────
  view.setUint32(0x50, 0,  true); // statusCondition = 0
  view.setUint8 (0x54, 5);        // level = 5
  // 0x55 mail id stays 0
  view.setUint16(0x56, 20, true); // currentHp  = 20
  view.setUint16(0x58, 20, true); // maxHp      = 20
  view.setUint16(0x5a, 12, true); // attack     = 12
  view.setUint16(0x5c, 10, true); // defense    = 10
  view.setUint16(0x5e, 15, true); // speed      = 15
  view.setUint16(0x60,  8, true); // spAttack   = 8
  view.setUint16(0x62,  8, true); // spDefense  = 8

  return buf;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('readPokemon', () => {
  it('parses species correctly (Pikachu = 25)', () => {
    const raw     = buildPikachuBuffer();
    const pokemon = readPokemon(raw);
    expect(pokemon.growth.species).toBe(25);
  });

  it('parses level correctly', () => {
    const pokemon = readPokemon(buildPikachuBuffer());
    expect(pokemon.level).toBe(5);
  });

  it('parses experience correctly', () => {
    const pokemon = readPokemon(buildPikachuBuffer());
    expect(pokemon.growth.experience).toBe(1000);
  });

  it('parses friendship correctly', () => {
    const pokemon = readPokemon(buildPikachuBuffer());
    expect(pokemon.growth.friendship).toBe(70);
  });

  it('parses moves correctly', () => {
    const pokemon = readPokemon(buildPikachuBuffer());
    expect(pokemon.attacks.moves[0]).toBe(33); // Tackle
    expect(pokemon.attacks.moves[1]).toBe(0);
    expect(pokemon.attacks.moves[2]).toBe(0);
    expect(pokemon.attacks.moves[3]).toBe(0);
  });

  it('parses PP correctly', () => {
    const pokemon = readPokemon(buildPikachuBuffer());
    expect(pokemon.attacks.pp[0]).toBe(35);
    expect(pokemon.attacks.pp[1]).toBe(0);
  });

  it('parses IVs correctly (all 15)', () => {
    const pokemon = readPokemon(buildPikachuBuffer());
    const { ivs, isEgg, abilitySlot } = unpackIVs(pokemon.misc.ivsEggAbility);
    expect(ivs.hp).toBe(15);
    expect(ivs.atk).toBe(15);
    expect(ivs.def).toBe(15);
    expect(ivs.spd).toBe(15);
    expect(ivs.spatk).toBe(15);
    expect(ivs.spdef).toBe(15);
    expect(isEgg).toBe(false);
    expect(abilitySlot).toBe(false);
  });

  it('parses party stats correctly', () => {
    const pokemon = readPokemon(buildPikachuBuffer());
    expect(pokemon.statusCondition).toBe(0);
    expect(pokemon.currentHp).toBe(20);
    expect(pokemon.maxHp).toBe(20);
    expect(pokemon.attack).toBe(12);
    expect(pokemon.defense).toBe(10);
    expect(pokemon.speed).toBe(15);
    expect(pokemon.spAttack).toBe(8);
    expect(pokemon.spDefense).toBe(8);
  });

  it('parses personalityValue and otId correctly', () => {
    const pokemon = readPokemon(buildPikachuBuffer());
    expect(pokemon.personalityValue).toBe(0);
    expect(pokemon.otId).toBe(0);
  });

  it('throws when buffer is smaller than 100 bytes', () => {
    const short = new Uint8Array(99);
    expect(() => readPokemon(short)).toThrow(RangeError);
  });

  it('throws on checksum mismatch', () => {
    const raw = buildPikachuBuffer();
    // Corrupt a byte in the encrypted block.
    raw[0x20] ^= 0xff;
    expect(() => readPokemon(raw)).toThrow(/[Cc]hecksum/);
  });
});

describe('writePokemon', () => {
  it('round-trip: writePokemon(readPokemon(raw)) produces identical bytes', () => {
    const raw      = buildPikachuBuffer();
    const pokemon  = readPokemon(raw);
    const written  = writePokemon(pokemon);
    expect(written).toEqual(raw);
  });

  it('preserves all substructure fields after a round-trip', () => {
    const raw      = buildPikachuBuffer();
    const original = readPokemon(raw);
    const restored = readPokemon(writePokemon(original));

    expect(restored.growth.species).toBe(original.growth.species);
    expect(restored.growth.experience).toBe(original.growth.experience);
    expect(restored.growth.friendship).toBe(original.growth.friendship);
    expect(restored.attacks.moves).toEqual(original.attacks.moves);
    expect(restored.attacks.pp).toEqual(original.attacks.pp);
    expect(restored.evs.hpEv).toBe(original.evs.hpEv);
    expect(restored.misc.ivsEggAbility).toBe(original.misc.ivsEggAbility);
  });

  it('preserves party-only fields after a round-trip', () => {
    const raw      = buildPikachuBuffer();
    const original = readPokemon(raw);
    const restored = readPokemon(writePokemon(original));

    expect(restored.level).toBe(original.level);
    expect(restored.currentHp).toBe(original.currentHp);
    expect(restored.maxHp).toBe(original.maxHp);
    expect(restored.attack).toBe(original.attack);
    expect(restored.defense).toBe(original.defense);
    expect(restored.speed).toBe(original.speed);
    expect(restored.spAttack).toBe(original.spAttack);
    expect(restored.spDefense).toBe(original.spDefense);
  });

  it('produces a 100-byte output', () => {
    const pokemon = readPokemon(buildPikachuBuffer());
    expect(writePokemon(pokemon)).toHaveLength(100);
  });
});
