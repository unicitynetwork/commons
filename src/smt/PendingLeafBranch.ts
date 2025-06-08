import { LeafBranch } from './LeafBranch.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { BigintConverter } from '../util/BigintConverter.js';

export class PendingLeafBranch {
  public constructor(
    public readonly path: bigint,
    public readonly value: Uint8Array,
  ) {}

  public async finalize(algorithm: HashAlgorithm): Promise<LeafBranch> {
    const hash = await new DataHasher(algorithm).update(BigintConverter.encode(this.path)).update(this.value).digest();
    return new LeafBranch(this.path, this.value, hash);
  }
}
