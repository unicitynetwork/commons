import { ISignature } from './ISignature.js';
import { HexConverter } from '../util/HexConverter.js';

export class Signature implements ISignature {
  public readonly algorithm: string = 'secp256k1';

  public constructor(
    private readonly _bytes: Uint8Array,
    private readonly recovery: number,
  ) {
    this._bytes = new Uint8Array(_bytes);
  }

  public get bytes(): Uint8Array {
    return new Uint8Array(this._bytes);
  }

  public static decode(bytes: Uint8Array): Signature {
    if (bytes.length !== 65) {
      throw new Error('Signature must contain signature and recovery byte.');
    }

    return new Signature(bytes.slice(0, -1), bytes[bytes.length - 1]);
  }

  public static fromDto(data: string): Signature {
    return Signature.decode(HexConverter.decode(data));
  }

  public toDto(): string {
    return HexConverter.encode(this.encode());
  }

  public encode(): Uint8Array {
    return new Uint8Array([...this._bytes, this.recovery]);
  }

  public toString(): string {
    return `${HexConverter.encode(this.encode())}`;
  }
}
