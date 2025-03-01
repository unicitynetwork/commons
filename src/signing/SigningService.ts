import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

import { ISigningService } from './ISigningService.js';
import { DataHasher, HashAlgorithm } from '../hash/DataHasher.js';

/**
 * Default signing service.
 * @implements {ISigningService}
 */
export class SigningService implements ISigningService {
  private readonly _publicKey: Uint8Array;

  /**
   * Signing service constructor.
   * @param {Uint8Array} privateKey private key bytes.
   */
  public constructor(private readonly privateKey: Uint8Array) {
    this.privateKey = new Uint8Array(privateKey);
    this._publicKey = secp256k1.getPublicKey(this.privateKey, true);
  }

  /**
   * @see {ISigningService.publicKey}
   */
  public get publicKey(): Uint8Array {
    return new Uint8Array(this._publicKey);
  }

  public get algorithm(): string {
    return 'secp256k1';
  }

  public static generatePrivateKey(): Uint8Array {
    return secp256k1.utils.randomPrivateKey();
  }

  public static async createFromSecret(secret: Uint8Array, nonce?: Uint8Array): Promise<ISigningService> {
    const hasher = new DataHasher(HashAlgorithm.SHA256);
    hasher.update(secret);
    if (nonce) {
      hasher.update(nonce);
    }

    return new SigningService(await hasher.digest());
  }

  /**
   * Verify secp256k1 signature hash.
   * @param {Uint8Array} hash Hash.
   * @param {Uint8Array} signature Signature.
   * @param {Uint8Array} publicKey Public key.
   */
  public static verifyWithPublicKey(hash: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    return Promise.resolve(secp256k1.verify(signature, hash, publicKey, { format: 'compact' }));
  }

  /**
   * Verify secp256k1 signature hash.
   * @param {Uint8Array} hash Hash.
   * @param {Uint8Array} signature Signature.
   */
  public verify(hash: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return SigningService.verifyWithPublicKey(hash, signature, this._publicKey);
  }

  /**
   * @see {ISigningService.sign}
   */
  public sign(bytes: Uint8Array): Promise<Uint8Array> {
    const hash: Uint8Array = sha256(bytes);
    const signature = secp256k1.sign(hash, this.privateKey);
    return Promise.resolve(new Uint8Array([...signature.toCompactRawBytes(), signature.recovery]));
  }
}
