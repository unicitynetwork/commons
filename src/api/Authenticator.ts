import { DataHash } from '../hash/DataHash.js';
import { Signature } from '../signing/Signature.js';
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
    public readonly signature: Signature,
    public readonly stateHash: DataHash,
  ) {
    this._publicKey = new Uint8Array(_publicKey);
  }

  public get publicKey(): Uint8Array {
    return new Uint8Array(this._publicKey);
  }

  public static async create(
    signingService: SigningService,
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
      Signature.fromDto(data.signature),
      DataHash.fromDto(data.stateHash),
    );
  }

  public static isDto(data: unknown): data is IAuthenticatorDto {
    return (
      typeof data === 'object' &&
      data !== null &&
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
      signature: this.signature.toDto(),
      stateHash: this.stateHash.toDto(),
    };
  }

  public verify(transactionHash: DataHash): Promise<boolean> {
    return SigningService.verifyWithPublicKey(transactionHash.imprint, this.signature.bytes, this.publicKey);
  }

  public toString(): string {
    return dedent`
      Authenticator
        Public Key: ${HexConverter.encode(this._publicKey)}
        Signature Algorithm: ${this.algorithm}
        Signature: ${this.signature.toString()}
        State Hash: ${this.stateHash.toString()}`;
  }
}
