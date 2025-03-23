import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export class LeafBranch {
  public constructor(
    public readonly path: bigint,
    private readonly _value: Uint8Array,
    public readonly hash: DataHash,
  ) {
    this._value = new Uint8Array(_value);
  }

  public get value(): Uint8Array {
    return new Uint8Array(this._value);
  }

  public static async create(algorithm: HashAlgorithm, path: bigint, value: Uint8Array): Promise<LeafBranch> {
    const hash = await new DataHasher(algorithm).update(BigintConverter.encode(path)).update(value).digest();
    return new LeafBranch(path, value, hash);
  }

  public toString(): string {
    return dedent`
      Branch[${this.path.toString(2)}]
        Hash: ${this.hash.toString()} 
        Value: ${HexConverter.encode(this._value)}`;
  }
}
