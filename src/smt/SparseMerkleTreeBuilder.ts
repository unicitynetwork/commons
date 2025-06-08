import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { PendingBranch } from './PendingBranch.js';
import { PendingLeafBranch } from './PendingLeafBranch.js';
import { PendingNodeBranch } from './PendingNodeBranch.js';
import { RootNode } from './RootNode.js';
import { calculateCommonPath } from './SparseMerkleTreePathUtils.js';
import { IDataHasher } from '../hash/IDataHasher.js';
import { IDataHasherFactory } from '../hash/IDataHasherFactory.js';

export class SparseMerkleTreeBuilder {
  private left: PendingBranch | Branch | null = null;
  private right: PendingBranch | Branch | null = null;

  public constructor(public readonly factory: IDataHasherFactory<IDataHasher>) {}

  public addLeaf(path: bigint, valueRef: Uint8Array): void {
    const isRight = path & 1n;
    const value = new Uint8Array(valueRef);
    if (isRight) {
      this.right = this.right ? this.buildTree(this.right, path, value) : new PendingLeafBranch(path, value);
    } else {
      this.left = this.left ? this.buildTree(this.left, path, value) : new PendingLeafBranch(path, value);
    }
  }

  public async calculateRoot(): Promise<RootNode> {
    const [left, right] = await Promise.all([this.left?.finalize(this.factory), this.right?.finalize(this.factory)]);
    const hash = await this.factory
      .create()
      .update(left?.hash.data ?? new Uint8Array(1))
      .update(right?.hash.data ?? new Uint8Array(1))
      .digest();

    this.left = left ?? null;
    this.right = right ?? null;
    return new RootNode(left ?? null, right ?? null, hash);
  }

  private buildTree(branch: PendingBranch, remainingPath: bigint, value: Uint8Array): PendingBranch {
    const commonPath = calculateCommonPath(remainingPath, branch.path);
    const isRight = (remainingPath >> commonPath.length) & 1n;

    if (commonPath.path === remainingPath) {
      throw new Error('Cannot add leaf inside branch.');
    }

    // If a leaf must be split from the middle
    if (branch instanceof PendingLeafBranch || branch instanceof LeafBranch) {
      if (commonPath.path === branch.path) {
        throw new Error('Cannot extend tree through leaf.');
      }

      const oldBranch = new PendingLeafBranch(branch.path >> commonPath.length, branch.value);
      const newBranch = new PendingLeafBranch(remainingPath >> commonPath.length, value);
      return new PendingNodeBranch(commonPath.path, isRight ? oldBranch : newBranch, isRight ? newBranch : oldBranch);
    }

    // If node branch is split in the middle
    if (commonPath.path < branch.path) {
      const newBranch = new PendingLeafBranch(remainingPath >> commonPath.length, value);
      const oldBranch = new PendingNodeBranch(branch.path >> commonPath.length, branch.left, branch.right);
      return new PendingNodeBranch(commonPath.path, isRight ? oldBranch : newBranch, isRight ? newBranch : oldBranch);
    }

    if (isRight) {
      return new PendingNodeBranch(
        branch.path,
        branch.left,
        this.buildTree(branch.right, remainingPath >> commonPath.length, value),
      );
    }

    return new PendingNodeBranch(
      branch.path,
      this.buildTree(branch.left, remainingPath >> commonPath.length, value),
      branch.right,
    );
  }
}
