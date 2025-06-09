import { LeafBranch } from './LeafBranch.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { IDataHasher } from '../hash/IDataHasher.js';
import { IDataHasherFactory } from '../hash/IDataHasherFactory.js';

export class PendingLeafBranch {
  public constructor(
    public readonly path: bigint,
    private readonly _value: Uint8Array,
    public readonly sum: bigint,
  ) {}

  public get value(): Uint8Array {
    return new Uint8Array(this._value);
  }

  public async finalize(factory: IDataHasherFactory<IDataHasher>): Promise<LeafBranch> {
    const hash = await factory
      .create()
      .update(
        CborEncoder.encodeArray([
          CborEncoder.encodeUnsignedInteger(this.path),
          CborEncoder.encodeByteString(this.value),
          CborEncoder.encodeUnsignedInteger(this.sum),
        ]),
      )
      .digest();
    return new LeafBranch(this.path, this.value, this.sum, hash);
  }
}
