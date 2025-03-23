import { HashAlgorithm } from './HashAlgorithm.js';
import { HexConverter } from '../util/HexConverter.js';

export class DataHash {
  private readonly _imprint: Uint8Array;

  public constructor(
    public readonly algorithm: HashAlgorithm,
    private readonly _data: Uint8Array,
  ) {
    this._data = new Uint8Array(_data);
    this._imprint = new Uint8Array(_data.length + 2);
    this._imprint.set([algorithm & 0xff00, algorithm & 0xff]);
    this._imprint.set(new Uint8Array(_data), 2);
  }

  public get data(): Uint8Array {
    return new Uint8Array(this._data);
  }

  public get imprint(): Uint8Array {
    return new Uint8Array(this._imprint);
  }

  public static fromDto(data: string): DataHash {
    return new DataHash(parseInt(data.slice(0, 4), 16), HexConverter.decode(data.slice(4)));
  }

  public toDto(): string {
    return HexConverter.encode(this._imprint);
  }

  public equals(hash: DataHash): boolean {
    return HexConverter.encode(this._imprint) === HexConverter.encode(hash._imprint);
  }

  public toString(): string {
    return `[${HashAlgorithm[this.algorithm]}]${HexConverter.encode(this._data)}`;
  }
}
