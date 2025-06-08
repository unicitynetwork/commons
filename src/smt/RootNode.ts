import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { MerkleTreePath } from './MerkleTreePath.js';
import { MerkleTreePathStep } from './MerkleTreePathStep.js';
import { calculateCommonPath } from './SparseMerkleTreePathUtils.js';
import { DataHash } from '../hash/DataHash.js';

export class RootNode {
  public readonly path = 1n;

  public constructor(
    public readonly left: Branch | null,
    public readonly right: Branch | null,
    public readonly hash: DataHash,
  ) {}

  private static generatePath(
    remainingPath: bigint,
    left: Branch | null,
    right: Branch | null,
  ): ReadonlyArray<MerkleTreePathStep> {
    const isRight = remainingPath & 1n;
    const branch = isRight ? right : left;
    const siblingBranch = isRight ? left : right;

    if (branch === null) {
      return [MerkleTreePathStep.createWithoutBranch(remainingPath, siblingBranch)];
    }

    const commonPath = calculateCommonPath(remainingPath, branch.path);

    if (branch.path === commonPath.path) {
      if (branch instanceof LeafBranch) {
        return [MerkleTreePathStep.create(branch.path, branch, siblingBranch)];
      }

      // If path has ended, return the current non leaf branch data
      if (remainingPath >> commonPath.length === 1n) {
        return [MerkleTreePathStep.create(branch.path, branch, siblingBranch)];
      }

      return [
        ...this.generatePath(remainingPath >> commonPath.length, branch.left, branch.right),
        MerkleTreePathStep.create(branch.path, null, siblingBranch),
      ];
    }

    return [MerkleTreePathStep.create(branch.path, branch, siblingBranch)];
  }

  public getPath(path: bigint): MerkleTreePath {
    return new MerkleTreePath(this.hash, RootNode.generatePath(path, this.left, this.right));
  }
}
