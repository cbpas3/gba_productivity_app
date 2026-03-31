/**
 * Gen III Pokemon binary parser / serializer.
 *
 * Handles the complete 100-byte party Pokemon structure:
 *
 *   0x00  4   Personality Value (PV)        u32 LE
 *   0x04  4   Original Trainer ID (OTID)    u32 LE
 *   0x08 10   Nickname                      bytes
 *   0x12  1   Language                      u8
 *   0x13  1   Misc flags                    u8
 *   0x14  7   OT Name                       bytes
 *   0x1B  1   Markings                      u8
 *   0x1C  2   Checksum                      u16 LE
 *   0x1E  2   Padding                       (ignored)
 *   0x20 48   Encrypted data block
 *   0x50  4   Status condition              u32 LE  (party only)
 *   0x54  1   Level                         u8      (party only)
 *   0x55  1   Mail ID                       u8      (ignored)
 *   0x56  2   Current HP                    u16 LE  (party only)
 *   0x58  2   Max HP                        u16 LE  (party only)
 *   0x5A  2   Attack                        u16 LE  (party only)
 *   0x5C  2   Defense                       u16 LE  (party only)
 *   0x5E  2   Speed                         u16 LE  (party only)
 *   0x60  2   Sp. Attack                    u16 LE  (party only)
 *   0x62  2   Sp. Defense                   u16 LE  (party only)
 */

import type {
  Pokemon,
  GrowthSubstructure,
  AttacksSubstructure,
  EvsConditionSubstructure,
  MiscSubstructure,
} from '../../types/pokemon.ts';
import { decryptData, encryptData } from './crypto.ts';
import { unshuffleSubstructures, reshuffleSubstructures } from './substructures.ts';
import { calculateChecksum, validateChecksum } from './checksum.ts';

// ─── Offsets ─────────────────────────────────────────────────────────────────

const OFFSET_PV          = 0x00;
const OFFSET_OTID        = 0x04;
const OFFSET_NICKNAME    = 0x08;
const OFFSET_LANGUAGE    = 0x12;
const OFFSET_MISC_FLAGS  = 0x13;
const OFFSET_OT_NAME     = 0x14;
const OFFSET_MARKINGS    = 0x1b;
const OFFSET_CHECKSUM    = 0x1c;
const OFFSET_ENCRYPTED   = 0x20;
const OFFSET_STATUS      = 0x50;
const OFFSET_LEVEL       = 0x54;
// 0x55 = mail id (ignored)
const OFFSET_CURRENT_HP  = 0x56;
const OFFSET_MAX_HP      = 0x58;
const OFFSET_ATTACK      = 0x5a;
const OFFSET_DEFENSE     = 0x5c;
const OFFSET_SPEED       = 0x5e;
const OFFSET_SP_ATTACK   = 0x60;
const OFFSET_SP_DEFENSE  = 0x62;

const POKEMON_SIZE       = 100;
const ENCRYPTED_SIZE     = 48;

// ─── Substructure parsers ─────────────────────────────────────────────────────

/** Parse a 12-byte Growth substructure. */
export function parseGrowth(data: Uint8Array): GrowthSubstructure {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    species:    v.getUint16(0,  true),
    heldItem:   v.getUint16(2,  true),
    experience: v.getUint32(4,  true),
    ppBonuses:  v.getUint8 (8),
    friendship: v.getUint8 (9),
    // bytes 10-11 are unused
  };
}

/** Serialize a Growth substructure into 12 bytes. */
export function serializeGrowth(g: GrowthSubstructure): Uint8Array {
  const data = new Uint8Array(12);
  const v = new DataView(data.buffer);
  v.setUint16(0, g.species,    true);
  v.setUint16(2, g.heldItem,   true);
  v.setUint32(4, g.experience, true);
  v.setUint8 (8, g.ppBonuses);
  v.setUint8 (9, g.friendship);
  // bytes 10-11 left as 0x00
  return data;
}

/** Parse a 12-byte Attacks substructure. */
export function parseAttacks(data: Uint8Array): AttacksSubstructure {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    moves: [
      v.getUint16(0, true),
      v.getUint16(2, true),
      v.getUint16(4, true),
      v.getUint16(6, true),
    ],
    pp: [
      v.getUint8(8),
      v.getUint8(9),
      v.getUint8(10),
      v.getUint8(11),
    ],
  };
}

/** Serialize an Attacks substructure into 12 bytes. */
export function serializeAttacks(a: AttacksSubstructure): Uint8Array {
  const data = new Uint8Array(12);
  const v = new DataView(data.buffer);
  v.setUint16(0, a.moves[0], true);
  v.setUint16(2, a.moves[1], true);
  v.setUint16(4, a.moves[2], true);
  v.setUint16(6, a.moves[3], true);
  v.setUint8 (8,  a.pp[0]);
  v.setUint8 (9,  a.pp[1]);
  v.setUint8 (10, a.pp[2]);
  v.setUint8 (11, a.pp[3]);
  return data;
}

/** Parse a 12-byte EVs / Contest condition substructure. */
export function parseEvs(data: Uint8Array): EvsConditionSubstructure {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    hpEv:       v.getUint8(0),
    attackEv:   v.getUint8(1),
    defenseEv:  v.getUint8(2),
    speedEv:    v.getUint8(3),
    spAtkEv:    v.getUint8(4),
    spDefEv:    v.getUint8(5),
    coolness:   v.getUint8(6),
    beauty:     v.getUint8(7),
    cuteness:   v.getUint8(8),
    smartness:  v.getUint8(9),
    toughness:  v.getUint8(10),
    feel:       v.getUint8(11),
  };
}

/** Serialize an EVs substructure into 12 bytes. */
export function serializeEvs(e: EvsConditionSubstructure): Uint8Array {
  const data = new Uint8Array(12);
  const v = new DataView(data.buffer);
  v.setUint8(0,  e.hpEv);
  v.setUint8(1,  e.attackEv);
  v.setUint8(2,  e.defenseEv);
  v.setUint8(3,  e.speedEv);
  v.setUint8(4,  e.spAtkEv);
  v.setUint8(5,  e.spDefEv);
  v.setUint8(6,  e.coolness);
  v.setUint8(7,  e.beauty);
  v.setUint8(8,  e.cuteness);
  v.setUint8(9,  e.smartness);
  v.setUint8(10, e.toughness);
  v.setUint8(11, e.feel);
  return data;
}

/** Parse a 12-byte Misc substructure. */
export function parseMisc(data: Uint8Array): MiscSubstructure {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    pokerus:       v.getUint8 (0),
    metLocation:   v.getUint8 (1),
    originsInfo:   v.getUint16(2, true),
    ivsEggAbility: v.getUint32(4, true),
    ribbons:       v.getUint32(8, true),
  };
}

/** Serialize a Misc substructure into 12 bytes. */
export function serializeMisc(m: MiscSubstructure): Uint8Array {
  const data = new Uint8Array(12);
  const v = new DataView(data.buffer);
  v.setUint8 (0, m.pokerus);
  v.setUint8 (1, m.metLocation);
  v.setUint16(2, m.originsInfo,   true);
  v.setUint32(4, m.ivsEggAbility, true);
  v.setUint32(8, m.ribbons,       true);
  return data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a 100-byte raw buffer into a `Pokemon` object.
 *
 * Read flow:
 *   1. Read PV and OTID from the header.
 *   2. Extract and decrypt the 48-byte encrypted block.
 *   3. Validate the checksum (stored at 0x1C) against decrypted data.
 *   4. Unshuffle the four substructures according to PV.
 *   5. Parse each substructure.
 *   6. Read party-only fields.
 */
export function readPokemon(raw: Uint8Array): Pokemon {
  if (raw.byteLength < POKEMON_SIZE) {
    throw new RangeError(`Expected at least ${POKEMON_SIZE} bytes, got ${raw.byteLength}`);
  }

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  const pv   = view.getUint32(OFFSET_PV,   true) >>> 0;
  const otId = view.getUint32(OFFSET_OTID, true) >>> 0;

  const nickname = raw.slice(OFFSET_NICKNAME, OFFSET_NICKNAME + 10);
  const language  = view.getUint8(OFFSET_LANGUAGE);
  const miscFlags = view.getUint8(OFFSET_MISC_FLAGS);
  const otName    = raw.slice(OFFSET_OT_NAME, OFFSET_OT_NAME + 7);
  const markings  = view.getUint8(OFFSET_MARKINGS);
  const storedChecksum = view.getUint16(OFFSET_CHECKSUM, true);

  // Decrypt the 48-byte block.
  const encryptedBlock = raw.slice(OFFSET_ENCRYPTED, OFFSET_ENCRYPTED + ENCRYPTED_SIZE);
  const decryptedBlock = decryptData(encryptedBlock, pv, otId);

  // Validate checksum (non-fatal: we still parse, but bad saves will mismatch).
  if (!validateChecksum(storedChecksum, decryptedBlock)) {
    throw new Error(
      `Checksum mismatch: stored 0x${storedChecksum.toString(16).padStart(4, '0')}, ` +
      `computed 0x${calculateChecksum(decryptedBlock).toString(16).padStart(4, '0')}`,
    );
  }

  // Unshuffle and parse substructures.
  const { growth: gBytes, attacks: aBytes, evs: eBytes, misc: mBytes } =
    unshuffleSubstructures(decryptedBlock, pv);

  // Party-only fields (may be zero for box Pokemon).
  const statusCondition = view.getUint32(OFFSET_STATUS,    true) >>> 0;
  const level           = view.getUint8 (OFFSET_LEVEL);
  const currentHp       = view.getUint16(OFFSET_CURRENT_HP, true);
  const maxHp           = view.getUint16(OFFSET_MAX_HP,     true);
  const attack          = view.getUint16(OFFSET_ATTACK,     true);
  const defense         = view.getUint16(OFFSET_DEFENSE,    true);
  const speed           = view.getUint16(OFFSET_SPEED,      true);
  const spAttack        = view.getUint16(OFFSET_SP_ATTACK,  true);
  const spDefense       = view.getUint16(OFFSET_SP_DEFENSE, true);

  return {
    personalityValue: pv,
    otId,
    nickname,
    language,
    miscFlags,
    otName,
    markings,
    growth:  parseGrowth(gBytes),
    attacks: parseAttacks(aBytes),
    evs:     parseEvs(eBytes),
    misc:    parseMisc(mBytes),
    statusCondition,
    level,
    currentHp,
    maxHp,
    attack,
    defense,
    speed,
    spAttack,
    spDefense,
  };
}

/**
 * Serialize a `Pokemon` object back into a 100-byte Uint8Array.
 *
 * Write flow:
 *   1. Serialize all four substructures into 12-byte blocks.
 *   2. Reshuffle them according to PV.
 *   3. Calculate the checksum over the reshuffled (decrypted) data.
 *   4. Encrypt the shuffled block.
 *   5. Assemble the complete 100-byte structure.
 */
export function writePokemon(pokemon: Pokemon): Uint8Array {
  const pv   = pokemon.personalityValue >>> 0;
  const otId = pokemon.otId             >>> 0;

  // Serialize and reshuffle substructures.
  const growthBytes  = serializeGrowth(pokemon.growth);
  const attacksBytes = serializeAttacks(pokemon.attacks);
  const evsBytes     = serializeEvs(pokemon.evs);
  const miscBytes    = serializeMisc(pokemon.misc);

  const shuffled  = reshuffleSubstructures(growthBytes, attacksBytes, evsBytes, miscBytes, pv);
  const checksum  = calculateChecksum(shuffled);
  const encrypted = encryptData(shuffled, pv, otId);

  // Assemble the 100-byte buffer.
  const out  = new Uint8Array(POKEMON_SIZE);
  const view = new DataView(out.buffer);

  view.setUint32(OFFSET_PV,   pv,   true);
  view.setUint32(OFFSET_OTID, otId, true);

  // Nickname (10 bytes) — copy safely up to 10 bytes.
  const nicknameSlice = pokemon.nickname.slice(0, 10);
  out.set(nicknameSlice, OFFSET_NICKNAME);

  view.setUint8(OFFSET_LANGUAGE,  pokemon.language);
  view.setUint8(OFFSET_MISC_FLAGS, pokemon.miscFlags);

  // OT Name (7 bytes).
  const otNameSlice = pokemon.otName.slice(0, 7);
  out.set(otNameSlice, OFFSET_OT_NAME);

  view.setUint8 (OFFSET_MARKINGS, pokemon.markings);
  view.setUint16(OFFSET_CHECKSUM, checksum, true);
  // Bytes 0x1E-0x1F (padding) remain 0x00.

  out.set(encrypted, OFFSET_ENCRYPTED);

  // Party-only fields.
  view.setUint32(OFFSET_STATUS,    pokemon.statusCondition, true);
  view.setUint8 (OFFSET_LEVEL,     pokemon.level);
  // 0x55 (mail id) left as 0x00.
  view.setUint16(OFFSET_CURRENT_HP, pokemon.currentHp,  true);
  view.setUint16(OFFSET_MAX_HP,     pokemon.maxHp,      true);
  view.setUint16(OFFSET_ATTACK,     pokemon.attack,     true);
  view.setUint16(OFFSET_DEFENSE,    pokemon.defense,    true);
  view.setUint16(OFFSET_SPEED,      pokemon.speed,      true);
  view.setUint16(OFFSET_SP_ATTACK,  pokemon.spAttack,   true);
  view.setUint16(OFFSET_SP_DEFENSE, pokemon.spDefense,  true);

  return out;
}
