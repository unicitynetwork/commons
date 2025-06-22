import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { MerkleSumTreePath } from './MerkleSumTreePath.js';
import { MerkleSumTreePathStep } from './MerkleSumTreePathStep.js';
import { DataHash } from '../hash/DataHash.js';
import { calculateCommonPath } from '../smt/SparseMerkleTreePathUtils.js';
import { dedent } from '../util/StringUtils.js';

export class MerkleSumTreeRootNode {
  public readonly path = 1n;

  public constructor(
    public readonly left: Branch | null,
    public readonly right: Branch | null,
    public readonly sum: bigint,
    public readonly hash: DataHash,
  ) {}

  private static generatePath(
    remainingPath: bigint,
    left: Branch | null,
    right: Branch | null,
  ): ReadonlyArray<MerkleSumTreePathStep> {
    const isRight = remainingPath & 1n;
    const branch = isRight ? right : left;
    const siblingBranch = isRight ? left : right;

    if (branch === null) {
      return [MerkleSumTreePathStep.createWithoutBranch(remainingPath, siblingBranch)];
    }

    const commonPath = calculateCommonPath(remainingPath, branch.path);

    if (branch.path === commonPath.path) {
      if (branch instanceof LeafBranch) {
        return [MerkleSumTreePathStep.create(branch.path, branch, siblingBranch)];
      }

      // If path has ended, return the current non leaf branch data
      if (remainingPath >> commonPath.length === 1n) {
        return [MerkleSumTreePathStep.create(branch.path, branch, siblingBranch)];
      }

      return [
        ...this.generatePath(remainingPath >> commonPath.length, branch.left, branch.right),
        MerkleSumTreePathStep.create(branch.path, null, siblingBranch),
      ];
    }

    return [MerkleSumTreePathStep.create(branch.path, branch, siblingBranch)];
  }

  public getPath(path: bigint): MerkleSumTreePath {
    return new MerkleSumTreePath(this.hash, this.sum, MerkleSumTreeRootNode.generatePath(path, this.left, this.right));
  }

  public toString(): string {
    return dedent`
      Left: 
        ${this.left ? this.left.toString() : 'null'}
      Right: 
        ${this.right ? this.right.toString() : 'null'}`;
  }
}
