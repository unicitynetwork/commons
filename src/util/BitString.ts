import { HexConverter } from './HexConverter.js';
import { DataHash } from '../hash/DataHash.js';

export class BitString {
  /**
   * Represents a bit string as a bigint.
   * The first bit is always set to 1 to not lose leading bits when converting to bigint.
   */
  private readonly value: bigint;

  /**
   * Creates a BitString from a Uint8Array.
   * @param {Uint8Array} data - The input data to convert into a BitString.
   */
  public constructor(data: Uint8Array) {
    this.value = BigInt(`0x01${HexConverter.encode(data)}`);
  }

  /**
   * Creates a BitString from a DataHash imprint.
   * @param data DataHash
   * @return {BitString} A BitString instance
   */
  public static fromDataHash(data: DataHash): BitString {
    return new BitString(data.imprint);
  }

  /**
   * Converts bit string to bigint
   * @returns {bigint} The bigint representation of the bit string
   */
  public toBigInt(): bigint {
    return this.value;
  }

  /**
   * Converts bit string to string
   * @returns {string} The string representation of the bit string
   */
  public toString(): string {
    return this.value.toString(2).slice(1);
  }
}
