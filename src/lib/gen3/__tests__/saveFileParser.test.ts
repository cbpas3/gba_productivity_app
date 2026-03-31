import { describe, it, expect } from 'vitest';
import {
  parseSaveFile,
  getPartyPokemon,
  setPartyPokemon,
  calculateSectionChecksum,
} from '../saveFileParser';
import { readPokemon, writePokemon } from '../pokemonParser';

// ---------------------------------------------------------------------------
// Constants that mirror saveFileParser internals
// ---------------------------------------------------------------------------

const SECTION_SIZE       = 4096;
const SECTION_DATA_SIZE  = 3968;
const SECTIONS_PER_BLOCK = 14;
const BLOCK_SIZE         = SECTION_SIZE * SECTIONS_PER_BLOCK; // 57 344
const SAVE_SIZE          = BLOCK_SIZE * 2;                    // 114 688

const OFFSET_SECTION_ID  = 4084;
const OFFSET_CHECKSUM    = 4086;
const OFFSET_SIGNATURE   = 4088;
const OFFSET_SAVE_INDEX  = 4092;
const VALID_SIGNATURE    = 0x08012025;

const OFFSET_PARTY_COUNT = 0x0234;
const OFFSET_PARTY_START = 0x0238;

// ---------------------------------------------------------------------------
// Synthetic Pikachu (identical construction to pokemonParser.test.ts)
// ---------------------------------------------------------------------------

function buildPikachuBuffer(): Uint8Array {
  const buf  = new Uint8Array(100);
  const view = new DataView(buf.buffer);

  view.setUint8(0x12, 1); // language = 1

  // Growth
  const growth = new Uint8Array(12);
  const gv     = new DataView(growth.buffer);
  gv.setUint16(0, 25,   true); // species = 25
  gv.setUint16(2, 0,    true);
  gv.setUint32(4, 1000, true); // experience = 1000
  gv.setUint8 (8, 0);
  gv.setUint8 (9, 70);         // friendship = 70

  // Attacks
  const attacks = new Uint8Array(12);
  const av      = new DataView(attacks.buffer);
  av.setUint16(0, 33, true); // Tackle
  av.setUint8 (8, 35);       // pp = 35

  // EVs (zeros)
  const evs = new Uint8Array(12);

  // Misc – IVs all 15
  const ivWord = (15 | (15 << 5) | (15 << 10) | (15 << 15) | (15 << 20) | (15 << 25)) >>> 0;
  const misc   = new Uint8Array(12);
  const mv     = new DataView(misc.buffer);
  mv.setUint32(4, ivWord, true);

  // GAEM block (PV=0 → order index 0 = GAEM, key=0 → unencrypted)
  const block = new Uint8Array(48);
  block.set(growth,  0);
  block.set(attacks, 12);
  block.set(evs,     24);
  block.set(misc,    36);

  // Checksum
  let sum = 0;
  const bv = new DataView(block.buffer);
  for (let i = 0; i < 24; i++) sum += bv.getUint16(i * 2, true);
  view.setUint16(0x1c, sum & 0xffff, true);

  buf.set(block, 0x20);

  // Party stats
  view.setUint8 (0x54, 5);        // level = 5
  view.setUint16(0x56, 20, true); // currentHp
  view.setUint16(0x58, 20, true); // maxHp
  view.setUint16(0x5a, 12, true); // attack
  view.setUint16(0x5c, 10, true); // defense
  view.setUint16(0x5e, 15, true); // speed
  view.setUint16(0x60,  8, true); // spAttack
  view.setUint16(0x62,  8, true); // spDefense

  return buf;
}

// ---------------------------------------------------------------------------
// Synthetic 128 KB save file builder
// ---------------------------------------------------------------------------

/**
 * Write section metadata into `save` at the correct location for the given
 * block offset and physical section index.
 */
function writeSectionMetadata(
  save: Uint8Array,
  blockOffset: number,
  sectionIndex: number,
  sectionId: number,
  saveIndex: number,
): void {
  const base = blockOffset + sectionIndex * SECTION_SIZE;
  const view = new DataView(save.buffer);

  // Calculate section checksum for the first 3968 bytes of this section.
  const sectionData = save.slice(base, base + SECTION_DATA_SIZE);
  const checksum    = calculateSectionChecksum(sectionData);

  view.setUint16(base + OFFSET_SECTION_ID, sectionId,         true);
  view.setUint16(base + OFFSET_CHECKSUM,   checksum,          true);
  view.setUint32(base + OFFSET_SIGNATURE,  VALID_SIGNATURE,   true);
  view.setUint32(base + OFFSET_SAVE_INDEX, saveIndex >>> 0,   true);
}

/**
 * Build a minimal but valid 128 KB Gen III save file with one party Pikachu
 * in party slot 0 of Section ID 1 in Block A.
 *
 * Block A → save index 1 (active)
 * Block B → save index 0 (inactive)
 */
function buildSaveFile(): Uint8Array {
  const save = new Uint8Array(SAVE_SIZE); // all zeros

  // ── Block A (offset 0) ───────────────────────────────────────────────────

  // Write Pikachu into section 1 data (physical index 1 in block A).
  const sec1DataBase = 0 + 1 * SECTION_SIZE; // 4096
  const dataView     = new DataView(save.buffer);

  // Party count = 1
  dataView.setUint32(sec1DataBase + OFFSET_PARTY_COUNT, 1, true);
  // Party slot 0 = Pikachu
  save.set(buildPikachuBuffer(), sec1DataBase + OFFSET_PARTY_START);

  // Write metadata for all 14 sections in Block A.
  // Physical index i → section ID i, save index 1.
  for (let i = 0; i < SECTIONS_PER_BLOCK; i++) {
    writeSectionMetadata(save, 0, i, i, 1);
  }

  // ── Block B (offset BLOCK_SIZE) ──────────────────────────────────────────
  // All data is zero; write metadata with save index 0 so Block A is active.
  for (let i = 0; i < SECTIONS_PER_BLOCK; i++) {
    writeSectionMetadata(save, BLOCK_SIZE, i, i, 0);
  }

  return save;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseSaveFile', () => {
  it('determines activeBlock = "A" when A has a higher save index', () => {
    const save = buildSaveFile();
    const sf   = parseSaveFile(save);
    expect(sf.activeBlock).toBe('A');
  });

  it('returns 14 sections from the active block', () => {
    const sf = parseSaveFile(buildSaveFile());
    expect(sf.sections).toHaveLength(14);
  });

  it('sections have the correct IDs (0–13)', () => {
    const sf = parseSaveFile(buildSaveFile());
    const ids = sf.sections.map((s) => s.sectionId).sort((a, b) => a - b);
    expect(ids).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('throws when save file is smaller than SAVE_SIZE bytes', () => {
    const short = new Uint8Array(SAVE_SIZE - 1);
    expect(() => parseSaveFile(short)).toThrow(RangeError);
  });

  it('determines activeBlock = "B" when B has a higher save index', () => {
    const save = buildSaveFile();
    // Overwrite Block B save index to 2 (higher than Block A's 1).
    const view = new DataView(save.buffer);
    view.setUint32(BLOCK_SIZE + OFFSET_SAVE_INDEX, 2, true);

    // Recalculate section 0 checksum for Block B to avoid validation issues.
    // (parseSaveFile does not validate section checksums; it trusts the save index.)
    const sf = parseSaveFile(save);
    expect(sf.activeBlock).toBe('B');
  });
});

describe('getPartyPokemon', () => {
  it('returns exactly 1 party Pokemon from the synthetic save', () => {
    const sf    = parseSaveFile(buildSaveFile());
    const party = getPartyPokemon(sf);
    expect(party).toHaveLength(1);
  });

  it('returns a Pikachu (species 25) in slot 0', () => {
    const sf    = parseSaveFile(buildSaveFile());
    const party = getPartyPokemon(sf);
    expect(party[0].growth.species).toBe(25);
  });

  it('returns empty array when party count = 0', () => {
    const save    = buildSaveFile();
    const view    = new DataView(save.buffer);
    const sec1Base = 1 * SECTION_SIZE;

    // Set party count to 0.
    view.setUint32(sec1Base + OFFSET_PARTY_COUNT, 0, true);

    // Recalculate section 1 checksum.
    const sectionData = save.slice(sec1Base, sec1Base + SECTION_DATA_SIZE);
    const checksum    = calculateSectionChecksum(sectionData);
    view.setUint16(sec1Base + OFFSET_CHECKSUM, checksum, true);

    const sf    = parseSaveFile(save);
    const party = getPartyPokemon(sf);
    expect(party).toHaveLength(0);
  });
});

describe('setPartyPokemon', () => {
  it('writing back the same Pokemon produces an identical buffer', () => {
    const save       = buildSaveFile();
    const sf         = parseSaveFile(save);
    const pikachu    = getPartyPokemon(sf)[0];
    const modified   = setPartyPokemon(sf, 0, pikachu);

    expect(modified).toEqual(save);
  });

  it('modified save can be re-parsed and shows the updated Pokemon', () => {
    const save   = buildSaveFile();
    const sf     = parseSaveFile(save);
    let pikachu  = getPartyPokemon(sf)[0];

    // Change the experience.
    pikachu = { ...pikachu, growth: { ...pikachu.growth, experience: 5000 } };

    const modified = setPartyPokemon(sf, 0, pikachu);
    const sf2      = parseSaveFile(modified);
    const party2   = getPartyPokemon(sf2);

    expect(party2[0].growth.experience).toBe(5000);
  });

  it('does not mutate the original SaveFile', () => {
    const save = buildSaveFile();
    const sf   = parseSaveFile(save);
    const raw  = sf.raw.slice(); // capture original raw bytes

    const pikachu = getPartyPokemon(sf)[0];
    setPartyPokemon(sf, 0, pikachu);

    expect(sf.raw).toEqual(raw);
  });

  it('throws on out-of-range slot', () => {
    const sf      = parseSaveFile(buildSaveFile());
    const pikachu = getPartyPokemon(sf)[0];
    expect(() => setPartyPokemon(sf, 6, pikachu)).toThrow(RangeError);
    expect(() => setPartyPokemon(sf, -1, pikachu)).toThrow(RangeError);
  });
});

describe('calculateSectionChecksum', () => {
  it('returns 0 for all-zero 3968-byte input', () => {
    const data = new Uint8Array(SECTION_DATA_SIZE);
    expect(calculateSectionChecksum(data)).toBe(0);
  });

  it('throws RangeError for wrong-size input', () => {
    expect(() => calculateSectionChecksum(new Uint8Array(3967))).toThrow(RangeError);
    expect(() => calculateSectionChecksum(new Uint8Array(3969))).toThrow(RangeError);
  });

  it('produces a u16 result (0 ≤ result ≤ 0xFFFF)', () => {
    const data = new Uint8Array(SECTION_DATA_SIZE).fill(0xff);
    const cs   = calculateSectionChecksum(data);
    expect(cs).toBeGreaterThanOrEqual(0);
    expect(cs).toBeLessThanOrEqual(0xffff);
  });
});
