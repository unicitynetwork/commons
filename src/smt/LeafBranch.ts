import { DataHasher, IHashAlgorithm } from '../hash/DataHasher.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export class LeafBranch {
  public constructor(
    public readonly path: bigint,
    private readonly _value: Uint8Array,
    private readonly _hash: Uint8Array,
  ) {
    this._value = new Uint8Array(_value);
    this._hash = new Uint8Array(_hash);
  }

  public get value(): Uint8Array {
    return new Uint8Array(this._value);
  }

  public get hash(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  public static async create(algorithm: IHashAlgorithm, path: bigint, value: Uint8Array): Promise<LeafBranch> {
    const hash = await new DataHasher(algorithm).update(BigintConverter.encode(path)).update(value).digest();
    return new LeafBranch(path, value, hash);
  }

  public toString(): string {
    return dedent`
      Branch[${this.path.toString(2)}]:
        hash: ${HexConverter.encode(this._hash)} 
        value: ${HexConverter.encode(this._value)}`;
  }
}
