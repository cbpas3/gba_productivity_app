/**
 * Gen III Pokemon substructure ordering and shuffling.
 *
 * The 48-byte decrypted data block is composed of four 12-byte substructures:
 *   G – Growth
 *   A – Attacks
 *   E – EVs / Contest condition
 *   M – Misc
 *
 * Their order within the block is determined by (PV % 24).  The table below
 * lists the canonical order for each remainder value.
 */

import type { SubstructureLabel, SubstructureOrder } from './types.ts';

/** Total size of one substructure in bytes. */
const SUBSTRUCTURE_SIZE = 12;

/** All 24 orderings indexed by (PV % 24). */
const SUBSTRUCTURE_ORDERS: readonly SubstructureOrder[] = [
  ['G', 'A', 'E', 'M'], // 0  – GAEM
  ['G', 'A', 'M', 'E'], // 1  – GAME
  ['G', 'E', 'A', 'M'], // 2  – GEAM
  ['G', 'E', 'M', 'A'], // 3  – GEMA
  ['G', 'M', 'A', 'E'], // 4  – GMAE
  ['G', 'M', 'E', 'A'], // 5  – GMEA
  ['A', 'G', 'E', 'M'], // 6  – AGEM
  ['A', 'G', 'M', 'E'], // 7  – AGME
  ['A', 'E', 'G', 'M'], // 8  – AEGM
  ['A', 'E', 'M', 'G'], // 9  – AEMG
  ['A', 'M', 'G', 'E'], // 10 – AMGE
  ['A', 'M', 'E', 'G'], // 11 – AMEG
  ['E', 'G', 'A', 'M'], // 12 – EGAM
  ['E', 'G', 'M', 'A'], // 13 – EGMA
  ['E', 'A', 'G', 'M'], // 14 – EAGM
  ['E', 'A', 'M', 'G'], // 15 – EAMG
  ['E', 'M', 'G', 'A'], // 16 – EMGA
  ['E', 'M', 'A', 'G'], // 17 – EMAG
  ['M', 'G', 'A', 'E'], // 18 – MGAE
  ['M', 'G', 'E', 'A'], // 19 – MGEA
  ['M', 'A', 'G', 'E'], // 20 – MAGE
  ['M', 'A', 'E', 'G'], // 21 – MAEG
  ['M', 'E', 'G', 'A'], // 22 – MEGA
  ['M', 'E', 'A', 'G'], // 23 – MEAG
] as const;

/** Return the 4-label order for the given personality value. */
export function getSubstructureOrder(pv: number): SubstructureOrder {
  return SUBSTRUCTURE_ORDERS[(pv >>> 0) % 24];
}

/** Extract one 12-byte substructure by its position index (0–3). */
function sliceSubstructure(decrypted: Uint8Array, position: number): Uint8Array {
  const offset = position * SUBSTRUCTURE_SIZE;
  return decrypted.slice(offset, offset + SUBSTRUCTURE_SIZE);
}

/**
 * Unshuffle the 48-byte decrypted block back into canonical G/A/E/M slices.
 *
 * The decrypted bytes are stored in the order dictated by the PV; this
 * function extracts each substructure from its actual position and returns
 * them labeled for easy access.
 */
export function unshuffleSubstructures(
  decrypted: Uint8Array,
  pv: number,
): { growth: Uint8Array; attacks: Uint8Array; evs: Uint8Array; misc: Uint8Array } {
  const order = getSubstructureOrder(pv);

  // Build a map from label → position in the shuffled block.
  const positionOf: Record<SubstructureLabel, number> = { G: 0, A: 0, E: 0, M: 0 };
  for (let i = 0; i < 4; i++) {
    positionOf[order[i]] = i;
  }

  return {
    growth: sliceSubstructure(decrypted, positionOf['G']),
    attacks: sliceSubstructure(decrypted, positionOf['A']),
    evs: sliceSubstructure(decrypted, positionOf['E']),
    misc: sliceSubstructure(decrypted, positionOf['M']),
  };
}

/**
 * Reshuffle four canonical 12-byte substructures back into the shuffled order
 * required by the given PV, producing a 48-byte block ready to encrypt.
 */
export function reshuffleSubstructures(
  growth: Uint8Array,
  attacks: Uint8Array,
  evs: Uint8Array,
  misc: Uint8Array,
  pv: number,
): Uint8Array {
  const order = getSubstructureOrder(pv);

  // Map label → canonical data.
  const dataFor: Record<SubstructureLabel, Uint8Array> = {
    G: growth,
    A: attacks,
    E: evs,
    M: misc,
  };

  const result = new Uint8Array(48);
  for (let position = 0; position < 4; position++) {
    const label = order[position];
    const src = dataFor[label];
    result.set(src, position * SUBSTRUCTURE_SIZE);
  }

  return result;
}
