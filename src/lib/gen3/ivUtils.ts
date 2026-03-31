/**
 * Gen III Pokemon IV packing / unpacking.
 *
 * The IVs, egg flag, and ability slot are stored as a packed u32 at offset 4
 * within the Misc substructure (absolute offset 4 within that 12-byte block).
 *
 * Bit layout (LSB first):
 *   bits  0– 4 : HP IV       (0–31)
 *   bits  5– 9 : Atk IV      (0–31)
 *   bits 10–14 : Def IV      (0–31)
 *   bits 15–19 : Spd IV      (0–31)
 *   bits 20–24 : SpAtk IV    (0–31)
 *   bits 25–29 : SpDef IV    (0–31)
 *   bit  30    : Egg flag
 *   bit  31    : Ability slot (0 = ability 0, 1 = ability 1)
 */

import type { IVSet } from '../../types/reward.ts';

const IV_MASK = 0x1f; // 5-bit mask for a single IV

/**
 * Unpack a 32-bit IV word into individual IV values plus the egg and ability
 * flags.
 */
export function unpackIVs(
  packed: number,
): { ivs: IVSet; isEgg: boolean; abilitySlot: boolean } {
  const u32 = packed >>> 0;

  return {
    ivs: {
      hp:    (u32 >>> 0)  & IV_MASK,
      atk:   (u32 >>> 5)  & IV_MASK,
      def:   (u32 >>> 10) & IV_MASK,
      spd:   (u32 >>> 15) & IV_MASK,
      spatk: (u32 >>> 20) & IV_MASK,
      spdef: (u32 >>> 25) & IV_MASK,
    },
    isEgg:       Boolean((u32 >>> 30) & 1),
    abilitySlot: Boolean((u32 >>> 31) & 1),
  };
}

/**
 * Pack an IVSet plus egg/ability flags back into a single u32.
 * Each IV is clamped to 0–31.
 */
export function packIVs(ivs: IVSet, isEgg: boolean, abilitySlot: boolean): number {
  const clamp = (n: number) => Math.max(0, Math.min(31, n)) & IV_MASK;

  const result =
    (clamp(ivs.hp)        << 0)  |
    (clamp(ivs.atk)       << 5)  |
    (clamp(ivs.def)       << 10) |
    (clamp(ivs.spd)       << 15) |
    (clamp(ivs.spatk)     << 20) |
    (clamp(ivs.spdef)     << 25) |
    ((isEgg       ? 1 : 0) << 30) |
    ((abilitySlot ? 1 : 0) << 31);

  return result >>> 0;
}
