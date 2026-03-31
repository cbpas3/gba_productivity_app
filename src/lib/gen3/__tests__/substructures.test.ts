import { describe, it, expect } from 'vitest';
import {
  getSubstructureOrder,
  unshuffleSubstructures,
  reshuffleSubstructures,
} from '../substructures';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a 12-byte block filled with a single repeating byte value. */
function makeSubstructure(fillByte: number): Uint8Array {
  return new Uint8Array(12).fill(fillByte);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getSubstructureOrder', () => {
  it('PV % 24 = 0 gives GAEM', () => {
    expect(getSubstructureOrder(0)).toEqual(['G', 'A', 'E', 'M']);
    expect(getSubstructureOrder(24)).toEqual(['G', 'A', 'E', 'M']);
    expect(getSubstructureOrder(48)).toEqual(['G', 'A', 'E', 'M']);
  });

  it('PV % 24 = 1 gives GAME', () => {
    expect(getSubstructureOrder(1)).toEqual(['G', 'A', 'M', 'E']);
  });

  it('PV % 24 = 6 gives AGEM', () => {
    expect(getSubstructureOrder(6)).toEqual(['A', 'G', 'E', 'M']);
  });

  it('PV % 24 = 11 gives AMEG', () => {
    expect(getSubstructureOrder(11)).toEqual(['A', 'M', 'E', 'G']);
  });

  it('PV % 24 = 14 gives EAGM', () => {
    expect(getSubstructureOrder(14)).toEqual(['E', 'A', 'G', 'M']);
  });

  it('PV % 24 = 18 gives MGAE', () => {
    expect(getSubstructureOrder(18)).toEqual(['M', 'G', 'A', 'E']);
  });

  it('PV % 24 = 23 gives MEAG', () => {
    expect(getSubstructureOrder(23)).toEqual(['M', 'E', 'A', 'G']);
  });

  it('always returns exactly 4 distinct labels from {G,A,E,M}', () => {
    for (let pv = 0; pv < 24; pv++) {
      const order = getSubstructureOrder(pv);
      expect(order).toHaveLength(4);
      const set = new Set(order);
      expect(set.has('G')).toBe(true);
      expect(set.has('A')).toBe(true);
      expect(set.has('E')).toBe(true);
      expect(set.has('M')).toBe(true);
    }
  });
});

describe('unshuffleSubstructures / reshuffleSubstructures', () => {
  it('round-trip for all 24 permutations: reshuffle(unshuffle(block)) === block', () => {
    // Use 4 distinct fill bytes so we can tell the substructures apart.
    const origGrowth  = makeSubstructure(0x11);
    const origAttacks = makeSubstructure(0x22);
    const origEvs     = makeSubstructure(0x33);
    const origMisc    = makeSubstructure(0x44);

    for (let pv = 0; pv < 24; pv++) {
      // Build the shuffled 48-byte block from the canonical substructures.
      const shuffled = reshuffleSubstructures(origGrowth, origAttacks, origEvs, origMisc, pv);
      expect(shuffled).toHaveLength(48);

      // Unshuffle back to canonical order.
      const { growth, attacks, evs, misc } = unshuffleSubstructures(shuffled, pv);

      expect(growth).toEqual(origGrowth);
      expect(attacks).toEqual(origAttacks);
      expect(evs).toEqual(origEvs);
      expect(misc).toEqual(origMisc);
    }
  });

  it('known ordering PV=0 (GAEM): block starts with G bytes', () => {
    const g = makeSubstructure(0xaa);
    const a = makeSubstructure(0xbb);
    const e = makeSubstructure(0xcc);
    const m = makeSubstructure(0xdd);
    const block = reshuffleSubstructures(g, a, e, m, 0);

    // GAEM: G is at position 0 (bytes 0–11).
    expect(block.slice(0, 12)).toEqual(g);
    expect(block.slice(12, 24)).toEqual(a);
    expect(block.slice(24, 36)).toEqual(e);
    expect(block.slice(36, 48)).toEqual(m);
  });

  it('known ordering PV=6 (AGEM): block starts with A bytes', () => {
    const g = makeSubstructure(0x01);
    const a = makeSubstructure(0x02);
    const e = makeSubstructure(0x03);
    const m = makeSubstructure(0x04);
    const block = reshuffleSubstructures(g, a, e, m, 6);

    // AGEM: A at position 0, G at 1, E at 2, M at 3.
    expect(block.slice(0, 12)).toEqual(a);
    expect(block.slice(12, 24)).toEqual(g);
    expect(block.slice(24, 36)).toEqual(e);
    expect(block.slice(36, 48)).toEqual(m);
  });

  it('known ordering PV=18 (MGAE): block starts with M bytes', () => {
    const g = makeSubstructure(0x10);
    const a = makeSubstructure(0x20);
    const e = makeSubstructure(0x30);
    const m = makeSubstructure(0x40);
    const block = reshuffleSubstructures(g, a, e, m, 18);

    // MGAE: M at 0, G at 1, A at 2, E at 3.
    expect(block.slice(0, 12)).toEqual(m);
    expect(block.slice(12, 24)).toEqual(g);
    expect(block.slice(24, 36)).toEqual(a);
    expect(block.slice(36, 48)).toEqual(e);
  });

  it('unshuffle extracts correct substructures for PV=6 (AGEM)', () => {
    // Build a block manually in AGEM order.
    const g = makeSubstructure(0xf1);
    const a = makeSubstructure(0xf2);
    const e = makeSubstructure(0xf3);
    const m = makeSubstructure(0xf4);

    // AGEM: A, G, E, M
    const block = new Uint8Array(48);
    block.set(a, 0);
    block.set(g, 12);
    block.set(e, 24);
    block.set(m, 36);

    const result = unshuffleSubstructures(block, 6);
    expect(result.growth).toEqual(g);
    expect(result.attacks).toEqual(a);
    expect(result.evs).toEqual(e);
    expect(result.misc).toEqual(m);
  });

  it('reshuffleSubstructures does not mutate inputs', () => {
    const g = makeSubstructure(0x05);
    const a = makeSubstructure(0x06);
    const e = makeSubstructure(0x07);
    const m = makeSubstructure(0x08);
    const gCopy = g.slice();
    const aCopy = a.slice();

    reshuffleSubstructures(g, a, e, m, 3);

    expect(g).toEqual(gCopy);
    expect(a).toEqual(aCopy);
  });
});
