import { ripemd160 } from '@noble/hashes/ripemd160';
import { sha1 } from '@noble/hashes/sha1';
import { sha224, sha256 } from '@noble/hashes/sha256';
import { sha384, sha512 } from '@noble/hashes/sha512';

import { IDataHasher } from './IDataHasher.js';

interface IMessageDigest {
  update(buf: Uint8Array): this;

  digest(): Uint8Array;

  destroy(): void;
}

export interface IHashAlgorithm {
  readonly name: string;
  create(): IMessageDigest;
}

export const HashAlgorithm = {
  RIPEMD160: { create: ripemd160.create, name: 'RIPEMD160' },
  SHA1: { create: sha1.create, name: 'SHA-1' },
  SHA224: { create: sha224.create, name: 'SHA-224' },
  SHA256: { create: sha256.create, name: 'SHA-256' },
  SHA384: { create: sha384.create, name: 'SHA-384' },
  SHA512: { create: sha512.create, name: 'SHA-512' },
};

/**
 * Provides synchronous hashing functions
 */
export class DataHasher implements IDataHasher {
  private _messageDigest: IMessageDigest;

  /**
   * Create DataHasher instance the hash algorithm
   * @param {IHashAlgorithm} _algorithm
   */
  public constructor(private readonly _algorithm: IHashAlgorithm) {
    this._messageDigest = _algorithm.create();
  }

  /**
   * Get hasher algorithm
   * @return {string}
   */
  public get algorithm(): string {
    return this._algorithm.name;
  }

  /**
   * Add data for hashing
   * @param {Uint8Array} data byte array
   * @returns {DataHasher}
   */
  public update(data: Uint8Array): this {
    this._messageDigest.update(data);
    return this;
  }

  /**
   * Hashes the data and returns the DataHash
   * @returns DataHash
   */
  public digest(): Promise<Uint8Array> {
    return Promise.resolve(this._messageDigest.digest());
  }

  public reset(): this {
    this._messageDigest = this._algorithm.create();
    return this;
  }
}
