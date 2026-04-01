/**
 * Gen III save file parser.
 *
 * Layout (128 KB = 131 072 bytes):
 *   Block A : 0x00000–0x0DFFF  (14 sections × 4096 bytes = 57 344 bytes)
 *   Block B : 0x0E000–0x1BFFF  (same layout)
 *
 * Each section (4096 bytes):
 *   bytes  0–3967  : section data  (3968 bytes)
 *   bytes  3968–4083 : padding     (116 bytes, ignored)
 *   bytes  4084–4085 : section ID  (u16 LE)
 *   bytes  4086–4087 : checksum    (u16 LE)
 *   bytes  4088–4091 : signature   (u32 LE, must be 0x08012025)
 *   bytes  4092–4095 : save index  (u32 LE)
 *
 * Active block = the block whose Section 0 has the higher saveIndex.
 *
 * Party data lives in Section ID 1:
 *   offset 0x0234 : party count  (u32 LE, 0–6)
 *   offset 0x0238 : party slot 0 (100 bytes each, max 6 slots)
 */

import type { SaveFile, SaveSection, GameVariant } from '../../types/savefile.ts';
import type { Pokemon } from '../../types/pokemon.ts';
import { readPokemon, writePokemon } from './pokemonParser.ts';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_SIZE         = 4096;
const SECTION_DATA_SIZE    = 3968;
const SECTIONS_PER_BLOCK   = 14;
const BLOCK_SIZE           = SECTION_SIZE * SECTIONS_PER_BLOCK; // 57 344
const TWO_BLOCKS_SIZE      = BLOCK_SIZE * 2;                     // 114 688 (minimum valid size)

const OFFSET_SECTION_ID    = 4084;
const OFFSET_CHECKSUM      = 4086;
const OFFSET_SIGNATURE     = 4088;
const OFFSET_SAVE_INDEX    = 4092;
const VALID_SIGNATURE      = 0x08012025;

const PARTY_SECTION_ID     = 1;
const POKEMON_SIZE         = 100;
const MAX_PARTY            = 6;

// Section 0, offset 0xAC: game code (u32 LE). 0 = R/S/E, 1 = FR/LG.
const SECTION0_GAME_CODE_OFFSET = 0xAC;

/**
 * Party data offsets differ between game variants:
 *   Ruby/Sapphire/Emerald:  count at 0x0234, data at 0x0238
 *   FireRed/LeafGreen:      count at 0x0034, data at 0x0038
 */
const PARTY_OFFSETS: Record<GameVariant, { count: number; start: number }> = {
  ruby_sapphire:     { count: 0x0234, start: 0x0238 },
  emerald:           { count: 0x0234, start: 0x0238 },
  firered_leafgreen: { count: 0x0034, start: 0x0038 },
};

// ─── Section checksum ─────────────────────────────────────────────────────────

/**
 * Calculate the section checksum for a 3968-byte data slice.
 *
 * Algorithm:
 *   1. Interpret the 3968 bytes as 992 little-endian u32 words.
 *   2. Sum them (no overflow in JS — max sum is 992 × 0xFFFFFFFF < 2^53).
 *   3. Fold the upper 16 bits into the lower 16 bits once.
 *   4. Mask to u16.
 */
export function calculateSectionChecksum(sectionData: Uint8Array): number {
  if (sectionData.byteLength !== SECTION_DATA_SIZE) {
    throw new RangeError(
      `calculateSectionChecksum expects ${SECTION_DATA_SIZE} bytes, got ${sectionData.byteLength}`,
    );
  }

  const view = new DataView(sectionData.buffer, sectionData.byteOffset, sectionData.byteLength);
  let sum = 0;

  for (let i = 0; i < 992; i++) {
    sum += view.getUint32(i * 4, true) >>> 0;
  }

  return (((sum >>> 16) + (sum & 0xffff)) & 0xffff);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Parse a single 4096-byte section at the given byte offset in the full save. */
function parseSection(raw: Uint8Array, blockOffset: number, sectionIndex: number): SaveSection {
  const base = blockOffset + sectionIndex * SECTION_SIZE;
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  const data      = raw.slice(base, base + SECTION_DATA_SIZE);
  const sectionId = view.getUint16(base + OFFSET_SECTION_ID, true);
  const checksum  = view.getUint16(base + OFFSET_CHECKSUM,   true);
  const signature = view.getUint32(base + OFFSET_SIGNATURE,  true) >>> 0;
  const saveIndex = view.getUint32(base + OFFSET_SAVE_INDEX, true) >>> 0;

  if (signature !== VALID_SIGNATURE) {
    // Non-fatal — the section is still returned so callers can inspect it.
    // (Blank / freshly formatted saves may have invalid sections.)
  }

  return { data, sectionId, checksum, signature, saveIndex };
}

/** Read all 14 sections for a given block (A at offset 0, B at offset BLOCK_SIZE). */
function parseBlock(raw: Uint8Array, blockOffset: number): SaveSection[] {
  const sections: SaveSection[] = [];
  for (let i = 0; i < SECTIONS_PER_BLOCK; i++) {
    sections.push(parseSection(raw, blockOffset, i));
  }
  return sections;
}

/** Find the section with a given section ID inside a section array. */
function findSection(sections: SaveSection[], id: number): SaveSection | undefined {
  return sections.find((s) => s.sectionId === id);
}

/**
 * Detect game variant from Section 0's game code field.
 *
 * Section 0 at offset 0xAC contains a u32:
 *   0 → Ruby/Sapphire (or Emerald — distinguished by security key location)
 *   1 → FireRed/LeafGreen
 *
 * For now we group R/S and Emerald since they share party offsets.
 */
function detectGameVariant(sections: SaveSection[]): GameVariant {
  const section0 = findSection(sections, 0);
  if (!section0) return 'ruby_sapphire';

  const view = new DataView(section0.data.buffer, section0.data.byteOffset, section0.data.byteLength);
  const gameCode = view.getUint32(SECTION0_GAME_CODE_OFFSET, true) >>> 0;

  if (gameCode === 1) return 'firered_leafgreen';
  return 'ruby_sapphire';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a full 128 KB Gen III save file buffer.
 *
 * Determines the active block by comparing the saveIndex stored in section
 * index 0 of each block.  The block with the higher saveIndex is active.
 * Also detects the game variant (R/S, Emerald, FR/LG) for correct offsets.
 */
export function parseSaveFile(data: Uint8Array): SaveFile {
  if (data.byteLength < TWO_BLOCKS_SIZE) {
    throw new RangeError(
      `Save file too small: expected at least ${TWO_BLOCKS_SIZE} bytes, got ${data.byteLength}`,
    );
  }

  // Preserve the entire buffer (128 KB including Hall of Fame, etc.)
  // so that setPartyPokemon returns a complete save, not a truncated one.
  const raw = new Uint8Array(data);

  const sectionsA = parseBlock(raw, 0);
  const sectionsB = parseBlock(raw, BLOCK_SIZE);

  const indexA = sectionsA[0]?.saveIndex ?? 0;
  const indexB = sectionsB[0]?.saveIndex ?? 0;

  const activeBlock    = indexB > indexA ? 'B' : 'A';
  const activeSections = activeBlock === 'B' ? sectionsB : sectionsA;
  const gameVariant    = detectGameVariant(activeSections);

  return {
    raw,
    activeBlock,
    sections: activeSections,
    gameVariant,
  };
}

/**
 * Extract all party Pokemon from a parsed save file.
 * Returns an array of 0–6 Pokemon objects.
 */
export function getPartyPokemon(saveFile: SaveFile): Pokemon[] {
  const section1 = findSection(saveFile.sections, PARTY_SECTION_ID);
  if (!section1) {
    const presentIds = saveFile.sections.map((s) => s.sectionId).sort((a, b) => a - b);
    console.warn('[getPartyPokemon] Section ID 1 not found. Present section IDs:', presentIds.join(', '),
      '— save file may be incomplete (common on the very first in-game save)');
    return [];
  }

  const offsets = PARTY_OFFSETS[saveFile.gameVariant];
  const data    = section1.data;
  const view    = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count   = Math.min(view.getUint32(offsets.count, true) >>> 0, MAX_PARTY);

  console.log('[getPartyPokemon] variant =', saveFile.gameVariant,
    'partyCount offset = 0x' + offsets.count.toString(16), 'count =', count);

  const party: Pokemon[] = [];
  for (let slot = 0; slot < count; slot++) {
    const offset = offsets.start + slot * POKEMON_SIZE;
    if (offset + POKEMON_SIZE > data.byteLength) {
      break;
    }
    const raw = data.slice(offset, offset + POKEMON_SIZE);
    try {
      party.push(readPokemon(raw));
      console.log('[getPartyPokemon] slot', slot, 'OK, species =', party[party.length - 1].growth.species);
    } catch (err) {
      console.error('[getPartyPokemon] slot', slot, 'FAILED:', err);
    }
  }

  return party;
}

/**
 * Write a Pokemon into a party slot and return the updated full 128 KB buffer.
 *
 * This function:
 *   1. Serializes the Pokemon back to 100 bytes.
 *   2. Writes those bytes into the Section 1 data at the correct slot offset.
 *   3. Recalculates the section checksum for the modified section.
 *   4. Writes the new section checksum into the raw buffer at the correct location.
 *   5. Returns a copy of the full raw buffer with those changes applied.
 */
export function setPartyPokemon(
  saveFile: SaveFile,
  slot: number,
  pokemon: Pokemon,
): Uint8Array {
  if (slot < 0 || slot >= MAX_PARTY) {
    throw new RangeError(`Party slot must be 0–${MAX_PARTY - 1}, got ${slot}`);
  }

  const section1Index = saveFile.sections.findIndex((s) => s.sectionId === PARTY_SECTION_ID);
  if (section1Index === -1) {
    throw new Error('Section 1 not found in active block');
  }

  // Clone the entire raw buffer so we never mutate the original.
  const output = saveFile.raw.slice();

  // Calculate the byte offset of this section's data start within the raw buffer.
  const blockOffset = saveFile.activeBlock === 'B' ? BLOCK_SIZE : 0;
  // section1Index is the physical position of the section with ID 1 in the
  // sections array, but physically sections are stored in order 0-13 in the
  // block.  We need the physical section position, which equals section1Index
  // because parseBlock reads sections in order.
  const sectionBase = blockOffset + section1Index * SECTION_SIZE;

  // Write the serialized Pokemon into the output buffer.
  const offsets = PARTY_OFFSETS[saveFile.gameVariant];
  const serialized    = writePokemon(pokemon);
  const pokemonOffset = sectionBase + offsets.start + slot * POKEMON_SIZE;

  output.set(serialized, pokemonOffset);

  // Recalculate and write the section checksum.
  const newSectionData = output.slice(sectionBase, sectionBase + SECTION_DATA_SIZE);
  const newChecksum    = calculateSectionChecksum(newSectionData);
  const checksumView   = new DataView(output.buffer, output.byteOffset, output.byteLength);
  checksumView.setUint16(sectionBase + OFFSET_CHECKSUM, newChecksum, true);

  return output;
}
