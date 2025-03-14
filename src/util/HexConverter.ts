import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export class HexConverter {
  /**
   * Convert byte array to hex
   * @param {Uint8Array} data byte array
   * @returns string hex string
   */
  public static encode(data: Uint8Array): string {
    return bytesToHex(data);
  }

  /**
   * Convert hex string to bytes
   * @param value hex string
   * @returns {Uint8Array} byte array
   */
  public static decode(value: string): Uint8Array {
    // Validate it's a hex string
    if (!/^[0-9a-fA-F]*$/.test(value)) {
      // If invalid hex characters, use string encoding
      return new TextEncoder().encode(value);
    }
    
    // Ensure even length by padding with a leading zero if needed
    const normalizedValue = value.length % 2 === 0 ? value : `0${value}`;
    return hexToBytes(normalizedValue);
  }
}