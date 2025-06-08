import { NodeBranch } from './NodeBranch.js';
import { PendingBranch } from './PendingBranch.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { BigintConverter } from '../util/BigintConverter.js';

export class PendingNodeBranch {
  public constructor(
    public readonly path: bigint,
    public readonly left: PendingBranch,
    public readonly right: PendingBranch,
  ) {}

  public async finalize(algorithm: HashAlgorithm): Promise<NodeBranch> {
    const [left, right] = await Promise.all([this.left.finalize(algorithm), this.right.finalize(algorithm)]);
    const childrenHash = await new DataHasher(algorithm).update(left.hash.data).update(right.hash.data).digest();
    const hash = await new DataHasher(algorithm)
      .update(BigintConverter.encode(this.path))
      .update(childrenHash.data)
      .digest();
    return new NodeBranch(this.path, left, right, childrenHash, hash);
  }
}
