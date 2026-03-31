/**
 * Gen III Pokemon encryption / decryption.
 *
 * The 48-byte encrypted block (offset 0x20–0x4F in the 100-byte structure) is
 * XOR-encrypted using a 32-bit key derived from the Personality Value and the
 * Original Trainer ID.  Encryption and decryption are the same operation.
 *
 * Key  = (PV XOR OTID) >>> 0
 * Each 4-byte little-endian word in the 48-byte block is XORed with the key.
 */

/** Number of bytes in the encrypted data block. */
const ENCRYPTED_BLOCK_SIZE = 48;

/**
 * XOR each 4-byte LE word of `input` with the derived key.
 * Returns a new Uint8Array — the original is never mutated.
 */
function xorBlock(input: Uint8Array, pv: number, otId: number): Uint8Array {
  if (input.byteLength !== ENCRYPTED_BLOCK_SIZE) {
    throw new RangeError(
      `Expected exactly ${ENCRYPTED_BLOCK_SIZE} bytes, got ${input.byteLength}`,
    );
  }

  const key = (pv ^ otId) >>> 0;
  const output = new Uint8Array(input.byteLength);
  const srcView = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const dstView = new DataView(output.buffer);

  for (let wordIndex = 0; wordIndex < 12; wordIndex++) {
    const byteOffset = wordIndex * 4;
    const word = srcView.getUint32(byteOffset, true); // little-endian
    dstView.setUint32(byteOffset, (word ^ key) >>> 0, true);
  }

  return output;
}

/**
 * Decrypt the 48-byte encrypted data block extracted from a raw Pokemon byte
 * array.  Pass only the 48-byte slice (offset 0x20–0x4F), not the full 100
 * bytes.
 */
export function decryptData(encrypted: Uint8Array, pv: number, otId: number): Uint8Array {
  return xorBlock(encrypted, pv, otId);
}

/**
 * Encrypt the 48-byte decrypted data block.  Identical to decryption because
 * XOR is its own inverse.
 */
export function encryptData(decrypted: Uint8Array, pv: number, otId: number): Uint8Array {
  return xorBlock(decrypted, pv, otId);
}
