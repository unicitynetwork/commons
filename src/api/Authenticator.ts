import { HexConverter } from '../util/HexConverter.js';

export interface IAuthenticatorDto {
  hashAlgorithm: string;
  publicKey: string;
  signatureAlgorithm: string;
  signature: string;
  state: string;
}

export class Authenticator {
  public constructor(
    public readonly hashAlgorithm: string,
    private readonly _publicKey: Uint8Array,
    public readonly signatureAlgorithm: string,
    private readonly _signature: Uint8Array,
    private readonly _state: Uint8Array,
  ) {
    this._publicKey = new Uint8Array(_publicKey);
    this._signature = new Uint8Array(_signature);
    this._state = new Uint8Array(_state);
  }

  public get publicKey(): Uint8Array {
    return new Uint8Array(this._publicKey);
  }

  public get signature(): Uint8Array {
    return new Uint8Array(this._signature);
  }

  public get state(): Uint8Array {
    return new Uint8Array(this._state);
  }

  public static fromDto(data: unknown): Authenticator {
    if (!Authenticator.isDto(data)) {
      throw new Error('Parsing authenticator dto failed.');
    }

    return new Authenticator(
      data.hashAlgorithm,
      HexConverter.decode(data.publicKey),
      data.signatureAlgorithm,
      HexConverter.decode(data.signature),
      HexConverter.decode(data.state),
    );
  }

  public static isDto(data: unknown): data is IAuthenticatorDto {
    return (
      data instanceof Object &&
      'hashAlgorithm' in data &&
      typeof data.hashAlgorithm === 'string' &&
      'publicKey' in data &&
      typeof data.publicKey === 'string' &&
      'signatureAlgorithm' in data &&
      typeof data.signatureAlgorithm === 'string' &&
      'signature' in data &&
      typeof data.signature === 'string' &&
      'state' in data &&
      typeof data.state === 'string'
    );
  }

  public toDto(): IAuthenticatorDto {
    return {
      hashAlgorithm: this.hashAlgorithm,
      publicKey: HexConverter.encode(this.publicKey),
      signature: HexConverter.encode(this.signature),
      signatureAlgorithm: this.signatureAlgorithm,
      state: HexConverter.encode(this.state),
    };
  }
}
