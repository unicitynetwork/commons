import { DataHash } from '../hash/DataHash.js';
import { ISigningService } from '../signing/ISigningService.js';
import { SigningService } from '../signing/SigningService.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export interface IAuthenticatorDto {
  publicKey: string;
  algorithm: string;
  signature: string;
  stateHash: string;
}

export class Authenticator {
  public constructor(
    private readonly _publicKey: Uint8Array,
    public readonly algorithm: string,
    private readonly _signature: Uint8Array,
    public readonly stateHash: DataHash,
  ) {
    this._publicKey = new Uint8Array(_publicKey);
    this._signature = new Uint8Array(_signature);
  }

  public get publicKey(): Uint8Array {
    return new Uint8Array(this._publicKey);
  }

  public get signature(): Uint8Array {
    return new Uint8Array(this._signature);
  }

  public static async create(
    signingService: ISigningService,
    transactionHash: DataHash,
    stateHash: DataHash,
  ): Promise<Authenticator> {
    return new Authenticator(
      signingService.publicKey,
      signingService.algorithm,
      await signingService.sign(transactionHash.imprint),
      stateHash,
    );
  }

  public static fromDto(data: unknown): Authenticator {
    if (!Authenticator.isDto(data)) {
      throw new Error('Parsing authenticator dto failed.');
    }

    return new Authenticator(
      HexConverter.decode(data.publicKey),
      data.algorithm,
      HexConverter.decode(data.signature),
      DataHash.fromDto(data.stateHash),
    );
  }

  public static isDto(data: unknown): data is IAuthenticatorDto {
    return (
      data instanceof Object &&
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
      publicKey: HexConverter.encode(this.publicKey),
      signature: HexConverter.encode(this.signature),
      stateHash: this.stateHash.toDto(),
    };
  }

  public verify(transactionHash: DataHash): Promise<boolean> {
    return SigningService.verifyWithPublicKey(this.publicKey, transactionHash.imprint, this.signature);
  }

  public toString(): string {
    return dedent`
      Authenticator
        Public Key: ${HexConverter.encode(this._publicKey)}
        Signature Algorithm: ${this.algorithm}
        Signature: ${HexConverter.encode(this._signature)}
        State Hash: ${this.stateHash.toString()}`;
  }
}
