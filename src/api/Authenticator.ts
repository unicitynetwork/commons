import { RequestId } from './RequestId.js';
import { CborDecoder } from '../cbor/CborDecoder.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { DataHash } from '../hash/DataHash.js';
import { Signature } from '../signing/Signature.js';
import { SigningService } from '../signing/SigningService.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export interface IAuthenticatorJson {
  publicKey: string;
  algorithm: string;
  signature: string;
  stateHash: string;
}

export class Authenticator {
  public constructor(
    public readonly algorithm: string,
    private readonly _publicKey: Uint8Array,
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
      signingService.algorithm,
      signingService.publicKey,
      await signingService.sign(transactionHash.data),
      stateHash,
    );
  }

  public static fromJSON(data: unknown): Authenticator {
    if (!Authenticator.isJSON(data)) {
      throw new Error('Parsing authenticator dto failed.');
    }

    return new Authenticator(
      data.algorithm,
      HexConverter.decode(data.publicKey),
      Signature.fromJSON(data.signature),
      DataHash.fromJSON(data.stateHash),
    );
  }

  public static isJSON(data: unknown): data is IAuthenticatorJson {
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

  public static fromCBOR(bytes: Uint8Array): Authenticator {
    const data = CborDecoder.readArray(bytes);
    return new Authenticator(
      CborDecoder.readTextString(data[0]),
      CborDecoder.readByteString(data[1]),
      Signature.decode(CborDecoder.readByteString(data[2])),
      DataHash.fromImprint(CborDecoder.readByteString(data[3])),
    );
  }

  public toCBOR(): Uint8Array {
    return CborEncoder.encodeArray([
      CborEncoder.encodeTextString(this.algorithm),
      CborEncoder.encodeByteString(this.publicKey),
      CborEncoder.encodeByteString(this.signature.encode()),
      CborEncoder.encodeByteString(this.stateHash.imprint),
    ]);
  }

  public toJSON(): IAuthenticatorJson {
    return {
      algorithm: this.algorithm,
      publicKey: HexConverter.encode(this.publicKey),
      signature: this.signature.toJSON(),
      stateHash: this.stateHash.toJSON(),
    };
  }

  public verify(transactionHash: DataHash): Promise<boolean> {
    return SigningService.verifyWithPublicKey(transactionHash.data, this.signature.bytes, this.publicKey);
  }

  public calculateRequestId(): Promise<RequestId> {
    return RequestId.create(this._publicKey, this.stateHash);
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
