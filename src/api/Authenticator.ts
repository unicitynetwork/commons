import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { SigningService } from '../signing/SigningService';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export interface IAuthenticatorDto {
  hashAlgorithm: string;
  publicKey: string;
  algorithm: string;
  signature: string;
  stateHash: string;
}

export class Authenticator {
  public constructor(
    public readonly hashAlgorithm: HashAlgorithm,
    private readonly _publicKey: Uint8Array,
    public readonly algorithm: string,
    private readonly _signature: Uint8Array,
    private readonly _stateHash: Uint8Array,
  ) {
    this._publicKey = new Uint8Array(_publicKey);
    this._signature = new Uint8Array(_signature);
    this._stateHash = new Uint8Array(_stateHash);
  }

  public get publicKey(): Uint8Array {
    return new Uint8Array(this._publicKey);
  }

  public get signature(): Uint8Array {
    return new Uint8Array(this._signature);
  }

  public get stateHash(): Uint8Array {
    return new Uint8Array(this._stateHash);
  }

  public static fromDto(data: unknown): Authenticator {
    if (!Authenticator.isDto(data)) {
      throw new Error('Parsing authenticator dto failed.');
    }

    return new Authenticator(
      data.hashAlgorithm as HashAlgorithm,
      HexConverter.decode(data.publicKey),
      data.algorithm,
      HexConverter.decode(data.signature),
      HexConverter.decode(data.stateHash),
    );
  }

  public static isDto(data: unknown): data is IAuthenticatorDto {
    return (
      data instanceof Object &&
      'hashAlgorithm' in data &&
      typeof data.hashAlgorithm === 'string' &&
      HashAlgorithm[data.hashAlgorithm as keyof typeof HashAlgorithm] &&
      'publicKey' in data &&
      typeof data.publicKey === 'string' &&
      'algorithm' in data &&
      typeof data.algorithm === 'string' &&
      'signature' in data &&
      typeof data.signature === 'string' &&
      'stateHash' in data &&
      typeof data.stateHash === 'string'
    );
  }

  public toDto(): IAuthenticatorDto {
    return {
      algorithm: this.algorithm,
      hashAlgorithm: this.hashAlgorithm,
      publicKey: HexConverter.encode(this.publicKey),
      signature: HexConverter.encode(this.signature),
      stateHash: HexConverter.encode(this.stateHash),
    };
  }

  public verify(transactionHash: Uint8Array): Promise<boolean> {
    return SigningService.verifyWithPublicKey(this.publicKey, transactionHash, this.signature);
  }

  public toString(): string {
    return dedent`
      Authenticator
        Hash Algorithm: ${this.hashAlgorithm}
        Public Key: ${HexConverter.encode(this._publicKey)}
        Signature Algorithm: ${this.algorithm}
        Signature: ${HexConverter.encode(this._signature)}
        State Hash: ${HexConverter.encode(this._stateHash)}`;
  }
}
