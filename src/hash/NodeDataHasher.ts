import { createHash, Hash } from 'crypto';

import { HashAlgorithm } from './HashAlgorithm.js';
import { IDataHasher } from './IDataHasher.js';

export class NodeDataHasher implements IDataHasher {
  private _hasher: Hash;

  /**
   * Create Node Hasher
   * @param {string} algorithm
   */
  public constructor(public readonly algorithm: HashAlgorithm) {
    this._hasher = createHash(this.algorithm);
  }

  /**
   * Digest the final result
   * @return {Promise<Uint8Array>}
   */
  public digest(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array(this._hasher.digest()));
  }

  /**
   * Update the hasher content
   * @param {Uint8Array} data byte array
   * @return {IDataHasher}
   */
  public update(data: Uint8Array): this {
    this._hasher.update(data);

    return this;
  }

  /**
   * Reset hasher.
   * @return {IDataHasher}
   */
  public reset(): this {
    this._hasher = createHash(this.algorithm);

    return this;
  }
}
