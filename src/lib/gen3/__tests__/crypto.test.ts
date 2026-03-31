import { describe, it, expect } from 'vitest';
import { decryptData, encryptData } from '../crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a 48-byte Uint8Array from a fill pattern. */
function makeBlock(fill: (i: number) => number): Uint8Array {
  const buf = new Uint8Array(48);
  for (let i = 0; i < 48; i++) buf[i] = fill(i);
  return buf;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('crypto – decryptData / encryptData', () => {
  it('round-trip: encrypt then decrypt restores original bytes', () => {
    const pv   = 0xdeadbeef >>> 0;
    const otId = 0xcafe1234 >>> 0;

    // 48 pseudo-random bytes using a simple deterministic pattern.
    const original = makeBlock((i) => (i * 37 + 13) & 0xff);

    const encrypted  = encryptData(original, pv, otId);
    const decrypted  = decryptData(encrypted, pv, otId);

    expect(decrypted).toEqual(original);
  });

  it('known-values: first word is XORed with key = PV ^ OTID', () => {
    const pv   = 0x12345678 >>> 0;
    const otId = 0x9abcdef0 >>> 0;
    // key = 0x12345678 ^ 0x9abcdef0 = 0x88888888
    const expectedKey = (pv ^ otId) >>> 0;
    expect(expectedKey).toBe(0x88888888);

    // Create a block where the first word is 0x00000001 (LE: 01 00 00 00).
    const input = new Uint8Array(48);
    const view  = new DataView(input.buffer);
    view.setUint32(0, 0x00000001, true);

    const output    = encryptData(input, pv, otId);
    const outView   = new DataView(output.buffer);
    const firstWord = outView.getUint32(0, true);

    // 0x00000001 XOR 0x88888888 = 0x88888889
    expect(firstWord).toBe((0x00000001 ^ 0x88888888) >>> 0);
  });

  it('key = 0 (PV = OTID = 0): data passes through unchanged', () => {
    const original = makeBlock((i) => i & 0xff);
    const result   = encryptData(original, 0, 0);
    expect(result).toEqual(original);
  });

  it('key = 0 (PV = OTID, non-zero): data passes through unchanged', () => {
    const pv   = 0xaabbccdd >>> 0;
    const otId = pv; // same value → key = 0
    const original = makeBlock((i) => (i * 7 + 3) & 0xff);
    const result   = encryptData(original, pv, otId);
    expect(result).toEqual(original);
  });

  it('throws RangeError when input is not exactly 48 bytes', () => {
    const short = new Uint8Array(47);
    expect(() => encryptData(short, 0, 0)).toThrow(RangeError);
    expect(() => decryptData(short, 0, 0)).toThrow(RangeError);

    const long = new Uint8Array(49);
    expect(() => encryptData(long, 0, 0)).toThrow(RangeError);
  });

  it('encrypt and decrypt are symmetric (same function behaviour)', () => {
    const pv   = 0x11223344 >>> 0;
    const otId = 0x55667788 >>> 0;
    const original = makeBlock((i) => (255 - i) & 0xff);

    // Encrypting twice should restore the original (XOR is its own inverse).
    const once  = encryptData(original, pv, otId);
    const twice = encryptData(once, pv, otId);
    expect(twice).toEqual(original);
  });

  it('does not mutate the input array', () => {
    const input  = makeBlock((i) => i & 0xff);
    const copy   = input.slice();
    encryptData(input, 0x12345678, 0x9abcdef0);
    expect(input).toEqual(copy);
  });
});
