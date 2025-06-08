import { DataHash } from '../hash/DataHash.js';

export class LeafBranch {
  public constructor(
    public readonly path: bigint,
    private readonly _value: Uint8Array,
    public readonly hash: DataHash,
  ) {}

  public get value(): Uint8Array {
    return new Uint8Array(this._value);
  }

  public finalize(): Promise<LeafBranch> {
    return Promise.resolve(this);
  }
}
