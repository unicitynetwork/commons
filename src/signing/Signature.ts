import { ISignature } from './ISignature.js';

export class Signature implements ISignature {
  public readonly algorithm: string = 'secp256k1';

  public constructor(
    private readonly _bytes: Uint8Array,
    public readonly recovery: number,
  ) {
    this._bytes = new Uint8Array(_bytes);
  }

  public get bytes(): Uint8Array {
    return new Uint8Array(this._bytes);
  }

  public static fromDto(data: Uint8Array): Signature {
    if (data.length < 66) {
      throw new Error('Signature must contain signature and recovery byte.');
    }

    return new Signature(data.slice(0, -1), data[data.length - 1]);
  }

  public toDto(): Uint8Array {
    return new Uint8Array([...this._bytes, this.recovery]);
  }
}
