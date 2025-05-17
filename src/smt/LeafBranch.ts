import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export class LeafBranch {
  public readonly hashPromise: Promise<DataHash>;

  public constructor(
    algorithm: HashAlgorithm,
    public readonly path: bigint,
    private readonly _value: Uint8Array,
  ) {
    this._value = new Uint8Array(_value);
    this.hashPromise = new DataHasher(algorithm).update(BigintConverter.encode(path)).update(this._value).digest();
  }

  public get value(): Uint8Array {
    return new Uint8Array(this._value);
  }

  public toString(): string {
    return dedent`
      Branch[${this.path.toString(2)}]
        Value: ${HexConverter.encode(this._value)}`;
  }
}
