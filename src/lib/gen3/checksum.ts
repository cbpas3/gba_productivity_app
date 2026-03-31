/**
 * Gen III Pokemon checksum utilities.
 *
 * The checksum is calculated over the 48-byte DECRYPTED data block.
 * Algorithm:
 *   1. Read all 24 little-endian u16 values from the 48 bytes.
 *   2. Sum them as a plain JavaScript number (no overflow risk for 24 × 65535).
 *   3. Truncate the result to u16 (& 0xFFFF).
 *
 * The result is stored at offset 0x1C in the 100-byte Pokemon structure.
 */

const DECRYPTED_BLOCK_SIZE = 48;
const U16_COUNT = DECRYPTED_BLOCK_SIZE / 2; // 24

/**
 * Calculate the checksum for the 48-byte decrypted data block.
 * Returns a value in the range 0x0000–0xFFFF.
 */
export function calculateChecksum(decryptedData: Uint8Array): number {
  if (decryptedData.byteLength !== DECRYPTED_BLOCK_SIZE) {
    throw new RangeError(
      `Expected exactly ${DECRYPTED_BLOCK_SIZE} bytes, got ${decryptedData.byteLength}`,
    );
  }

  const view = new DataView(decryptedData.buffer, decryptedData.byteOffset, decryptedData.byteLength);
  let sum = 0;

  for (let i = 0; i < U16_COUNT; i++) {
    sum += view.getUint16(i * 2, true); // little-endian
  }

  return sum & 0xffff;
}

/**
 * Compare a stored checksum value against a freshly computed one.
 * Returns `true` when the checksums match.
 */
export function validateChecksum(storedChecksum: number, decryptedData: Uint8Array): boolean {
  return calculateChecksum(decryptedData) === (storedChecksum & 0xffff);
}
