import { LeafBranch } from './LeafBranch.js';
import { MerkleSumTreeRootNode } from './MerkleSumTreeRootNode.js';
import { PendingBranch } from './PendingBranch.js';
import { PendingLeafBranch } from './PendingLeafBranch.js';
import { PendingNodeBranch } from './PendingNodeBranch.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { IDataHasher } from '../hash/IDataHasher.js';
import { IDataHasherFactory } from '../hash/IDataHasherFactory.js';
import { calculateCommonPath } from '../smt/SparseMerkleTreePathUtils.js';
import { BigintConverter } from '../util/BigintConverter.js';

export class SparseMerkleSumTreeBuilder {
  private left: PendingBranch | null = null;
  private right: PendingBranch | null = null;

  public constructor(private readonly factory: IDataHasherFactory<IDataHasher>) {}

  public addLeaf(path: bigint, value: Uint8Array, sum: bigint): void {
    if (sum < 0n) {
      throw new Error('Sum must be a unsigned integer.');
    }

    if (path < 1n) {
      throw new Error('Path must be a unsigned integer.');
    }

    const isRight = path & 1n;
    if (isRight) {
      this.right = this.right ? this.buildTree(this.right, path, value, sum) : new PendingLeafBranch(path, value, sum);
    } else {
      this.left = this.left ? this.buildTree(this.left, path, value, sum) : new PendingLeafBranch(path, value, sum);
    }
  }

  public async calculateRoot(): Promise<MerkleSumTreeRootNode> {
    const [left, right] = await Promise.all([this.left?.finalize(this.factory), this.right?.finalize(this.factory)]);
    const hash = await this.factory
      .create()
      .update(
        CborEncoder.encodeArray([
          left
            ? CborEncoder.encodeArray([
                CborEncoder.encodeByteString(left.hash.imprint),
                CborEncoder.encodeByteString(BigintConverter.encode(left.sum)),
              ])
            : CborEncoder.encodeNull(),
          right
            ? CborEncoder.encodeArray([
                CborEncoder.encodeByteString(right.hash.imprint),
                CborEncoder.encodeByteString(BigintConverter.encode(right.sum)),
              ])
            : CborEncoder.encodeNull(),
        ]),
      )
      .digest();

    this.left = left ?? null;
    this.right = right ?? null;
    return new MerkleSumTreeRootNode(left ?? null, right ?? null, (left?.sum ?? 0n) + (right?.sum ?? 0n), hash);
  }

  private buildTree(branch: PendingBranch, remainingPath: bigint, value: Uint8Array, sum: bigint): PendingBranch {
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

      const oldBranch = new PendingLeafBranch(branch.path >> commonPath.length, branch.value, branch.sum);
      const newBranch = new PendingLeafBranch(remainingPath >> commonPath.length, value, sum);
      return new PendingNodeBranch(commonPath.path, isRight ? oldBranch : newBranch, isRight ? newBranch : oldBranch);
    }

    // If node branch is split in the middle
    if (commonPath.path < branch.path) {
      const newBranch = new PendingLeafBranch(remainingPath >> commonPath.length, value, sum);
      const oldBranch = new PendingNodeBranch(branch.path >> commonPath.length, branch.left, branch.right);
      return new PendingNodeBranch(commonPath.path, isRight ? oldBranch : newBranch, isRight ? newBranch : oldBranch);
    }

    if (isRight) {
      return new PendingNodeBranch(
        branch.path,
        branch.left,
        this.buildTree(branch.right, remainingPath >> commonPath.length, value, sum),
      );
    }

    return new PendingNodeBranch(
      branch.path,
      this.buildTree(branch.left, remainingPath >> commonPath.length, value, sum),
      branch.right,
    );
  }
}
