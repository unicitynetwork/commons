import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { MerkleTreeRootNode } from './MerkleTreeRootNode.js';
import { PendingBranch } from './PendingBranch.js';
import { PendingLeafBranch } from './PendingLeafBranch.js';
import { PendingNodeBranch } from './PendingNodeBranch.js';
import { calculateCommonPath } from './SparseMerkleTreePathUtils.js';
import { IDataHasher } from '../hash/IDataHasher.js';
import { IDataHasherFactory } from '../hash/IDataHasherFactory.js';

export class SparseMerkleTreeBuilder {
  private left: Promise<PendingBranch | null> = Promise.resolve(null);
  private right: Promise<PendingBranch | null> = Promise.resolve(null);

  public constructor(public readonly factory: IDataHasherFactory<IDataHasher>) {}

  public async addLeaf(path: bigint, valueRef: Uint8Array): Promise<void> {
    if (path < 1n) {
      throw new Error('Path must be greater than 0.');
    }

    const isRight = path & 1n;
    const value = new Uint8Array(valueRef);
    const branchPromise = isRight ? this.right : this.left;
    const newBranchPromise = branchPromise.then((branch) =>
      branch ? this.buildTree(branch, path, value) : new PendingLeafBranch(path, value),
    );

    if (isRight) {
      this.right = newBranchPromise.catch(() => branchPromise);
    } else {
      this.left = newBranchPromise.catch(() => branchPromise);
    }

    await newBranchPromise;
  }

  public async calculateRoot(): Promise<MerkleTreeRootNode> {
    this.left = this.left.then(
      (branch): Promise<Branch | null> => (branch ? branch.finalize(this.factory) : Promise.resolve(null)),
    );
    this.right = this.right?.then(
      (branch): Promise<Branch | null> => (branch ? branch.finalize(this.factory) : Promise.resolve(null)),
    );
    const [left, right] = await Promise.all([
      this.left as Promise<Branch | null>,
      this.right as Promise<Branch | null>,
    ]);

    const hash = await this.factory
      .create()
      .update(left?.hash.data ?? new Uint8Array(1))
      .update(right?.hash.data ?? new Uint8Array(1))
      .digest();

    return new MerkleTreeRootNode(left ?? null, right ?? null, hash);
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
