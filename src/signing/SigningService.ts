import { secp256k1 } from '@noble/curves/secp256k1';

import { ISigningService } from './ISigningService.js';
import { Signature } from './Signature.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';

/**
 * Default signing service.
 * @implements {ISigningService}
 */
export class SigningService implements ISigningService<Signature> {
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

  public static async createFromSecret(secret: Uint8Array, nonce?: Uint8Array): Promise<SigningService> {
    const hasher = new DataHasher(HashAlgorithm.SHA256);
    hasher.update(secret);
    if (nonce) {
      hasher.update(nonce);
    }

    const hash = await hasher.digest();

    return new SigningService(hash.data);
  }

  public static verifySignatureWithRecoveredPublicKey(hash: DataHash, signature: Signature): Promise<boolean> {
    const publicKey = secp256k1.Signature.fromCompact(signature.bytes)
      .addRecoveryBit(signature.recovery)
      .recoverPublicKey(hash.data)
      .toRawBytes();
    return SigningService.verifyWithPublicKey(hash, signature.bytes, publicKey);
  }

  /**
   * Verify secp256k1 signature hash.
   * @param {Uint8Array} hash Hash.
   * @param {Uint8Array} signature Signature.
   * @param {Uint8Array} publicKey Public key.
   */
  public static verifyWithPublicKey(hash: DataHash, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    return Promise.resolve(secp256k1.verify(signature, hash.data, publicKey, { format: 'compact' }));
  }

  /**
   * Verify secp256k1 signature hash.
   * @param {Uint8Array} hash Hash.
   * @param {Uint8Array} signature Signature.
   */
  public verify(hash: DataHash, signature: Signature): Promise<boolean> {
    return SigningService.verifyWithPublicKey(hash, signature.bytes, this._publicKey);
  }

  /**
   * @see {ISigningService.sign} 32-byte hash.
   */
  public sign(hash: DataHash): Promise<Signature> {
    const signature = secp256k1.sign(hash.data, this.privateKey);
    return Promise.resolve(new Signature(signature.toCompactRawBytes(), signature.recovery));
  }
}
