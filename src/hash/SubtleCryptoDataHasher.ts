import { HashAlgorithm } from './HashAlgorithm.js';
import { IDataHasher } from './IDataHasher.js';
import { UnsupportedHashAlgorithm } from './UnsupportedHashAlgorithm.js';

export const Algorithm = {
  [HashAlgorithm.RIPEMD160]: null,
  [HashAlgorithm.SHA1]: 'SHA-1',
  [HashAlgorithm.SHA224]: null,
  [HashAlgorithm.SHA256]: 'SHA-256',
  [HashAlgorithm.SHA384]: 'SHA-384',
  [HashAlgorithm.SHA512]: 'SHA-512',
};

/**
 * Does hashing with asynchronous way
 */
export class SubtleCryptoDataHasher implements IDataHasher {
  private _data: Uint8Array;

  /**
   * Create DataHasher instance the hash algorithm
   * @param {string} algorithm
   */
  public constructor(public readonly algorithm: HashAlgorithm) {
    if (!Algorithm[algorithm]) {
      throw new UnsupportedHashAlgorithm(algorithm);
    }

    this._data = new Uint8Array(0);
  }

  /**
   * Add data for hashing
   * @param {Uint8Array} data byte array
   * @returns {SubtleCryptoDataHasher}
   */
  public update(data: Uint8Array): this {
    const previousData = this._data;
    this._data = new Uint8Array(previousData.length + data.length);
    this._data.set(previousData);
    this._data.set(data, previousData.length);

    return this;
  }

  /**
   * Create hashing Promise for getting result DataHash
   * @returns Promise.<DataHash, Error>
   */
  public async digest(): Promise<Uint8Array> {
    return new Uint8Array(await window.crypto.subtle.digest({ name: Algorithm[this.algorithm] as string }, this._data));
  }

  /**
   * Resets the hash calculation.
   * @returns {SubtleCryptoDataHasher} The same data hasher object object for chaining calls.
   */
  public reset(): this {
    this._data = new Uint8Array(0);

    return this;
  }
}
