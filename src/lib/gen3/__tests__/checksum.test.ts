import { describe, it, expect } from 'vitest';
import { calculateChecksum, validateChecksum } from '../checksum';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateChecksum', () => {
  it('all-zeros 48-byte block gives checksum 0', () => {
    const data = new Uint8Array(48);
    expect(calculateChecksum(data)).toBe(0);
  });

  it('known-data: 48 bytes of repeating 0x01 0x00 (u16 LE = 1 each, 24 slots) gives 24', () => {
    // Each pair of bytes [0x01, 0x00] is a u16 LE value of 1.
    // 48 bytes / 2 = 24 u16 values, each = 1 → sum = 24.
    const data = new Uint8Array(48);
    for (let i = 0; i < 48; i += 2) {
      data[i]     = 0x01; // low byte
      data[i + 1] = 0x00; // high byte
    }
    expect(calculateChecksum(data)).toBe(24);
  });

  it('sum wraps to u16 (truncates bits above 0xFFFF)', () => {
    // Fill with 0xFF 0xFF so each u16 = 0xFFFF = 65535.
    // 24 × 65535 = 1572840 → & 0xFFFF = 1572840 & 65535 = 0x17FF8 & 0xFFFF = 0x7FF8?
    // Let me calculate: 24 * 65535 = 1572840
    // 1572840 in hex = 0x17FFF8 → & 0xFFFF = 0xFFF8
    // But actually: 24 * 0xFFFF = 24 * 65535 = 1572840
    // 1572840 & 0xFFFF: 1572840 % 65536 = 1572840 - 24*65536 = 1572840 - 1572864 = -24 ... that's wrong
    // 24 * 65536 = 1572864 > 1572840 so 23 * 65536 = 1507328, 1572840 - 1507328 = 65512 = 0xFFE8
    const data = new Uint8Array(48).fill(0xff);
    const result = calculateChecksum(data);
    // 24 * 65535 = 1572840; 1572840 & 0xFFFF
    expect(result).toBe(1572840 & 0xffff);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffff);
  });

  it('throws RangeError when input is not exactly 48 bytes', () => {
    expect(() => calculateChecksum(new Uint8Array(47))).toThrow(RangeError);
    expect(() => calculateChecksum(new Uint8Array(49))).toThrow(RangeError);
    expect(() => calculateChecksum(new Uint8Array(0))).toThrow(RangeError);
  });
});

describe('validateChecksum', () => {
  it('returns true when stored checksum matches computed checksum', () => {
    const data     = new Uint8Array(48).fill(0x07);
    const computed = calculateChecksum(data);
    expect(validateChecksum(computed, data)).toBe(true);
  });

  it('returns false when stored checksum does not match', () => {
    const data     = new Uint8Array(48).fill(0x07);
    const computed = calculateChecksum(data);
    expect(validateChecksum(computed + 1, data)).toBe(false);
  });

  it('returns false after a single byte is changed', () => {
    const data = new Uint8Array(48);
    for (let i = 0; i < 48; i++) data[i] = i & 0xff;

    const stored = calculateChecksum(data);
    // Flip one byte.
    data[10] ^= 0xff;
    expect(validateChecksum(stored, data)).toBe(false);
  });

  it('treats storedChecksum as u16 (masks to 0xFFFF)', () => {
    const data     = new Uint8Array(48);
    const computed = calculateChecksum(data); // 0 for all-zero
    // Pass stored = 0x00010000 — upper bits should be masked off → effectively 0.
    expect(validateChecksum(0x00010000, data)).toBe(true);
  });

  it('round-trip: compute then validate returns true for non-trivial data', () => {
    const data = new Uint8Array(48);
    const view = new DataView(data.buffer);
    for (let i = 0; i < 12; i++) {
      view.setUint32(i * 4, 0xdeadbeef, true);
    }
    const checksum = calculateChecksum(data);
    expect(validateChecksum(checksum, data)).toBe(true);
  });
});
