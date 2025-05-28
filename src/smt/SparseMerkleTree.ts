import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { MerkleTreePath } from './MerkleTreePath.js';
import { MerkleTreePathStep } from './MerkleTreePathStep.js';
import { NodeBranch } from './NodeBranch.js';
import { RootNode } from './RootNode.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';

type CommonPath = { length: bigint; path: bigint };

export class SparseMerkleTree {
  private _root: RootNode;

  public constructor(public readonly algorithm: HashAlgorithm) {
    this._root = new RootNode(algorithm, null, null);
  }

  public get root(): RootNode {
    return this._root;
  }

  public static calculateCommonPath(path1: bigint, path2: bigint): CommonPath {
    let path = 1n;
    let mask = 1n;
    let length = 0n;

    while ((path1 & mask) === (path2 & mask) && path < path1 && path < path2) {
      mask <<= 1n;
      length += 1n;
      path = mask | ((mask - 1n) & path1);
    }

    return { length, path };
  }

  private static async generatePath(
    remainingPath: bigint,
    left: Branch | null,
    right: Branch | null,
  ): Promise<ReadonlyArray<MerkleTreePathStep>> {
    const isRight = remainingPath & 1n;
    const branch = isRight ? right : left;
    const siblingBranch = isRight ? left : right;

    if (branch === null) {
      return [await MerkleTreePathStep.createWithoutBranch(remainingPath, siblingBranch)];
    }

    const commonPath = SparseMerkleTree.calculateCommonPath(remainingPath, branch.path);

    if (branch.path === commonPath.path) {
      if (branch instanceof LeafBranch) {
        return [await MerkleTreePathStep.create(branch.path, branch, siblingBranch)];
      }

      // If path has ended, return the current non leaf branch data
      if (remainingPath >> commonPath.length === 1n) {
        return [await MerkleTreePathStep.create(branch.path, branch, siblingBranch)];
      }

      return [
        ...(await this.generatePath(remainingPath >> commonPath.length, branch.left, branch.right)),
        await MerkleTreePathStep.create(branch.path, null, siblingBranch),
      ];
    }

    return [await MerkleTreePathStep.create(branch.path, branch, siblingBranch)];
  }

  public addLeaf(path: bigint, value: Uint8Array): void {
    const isRight = path & 1n;
    let left: Branch | null;
    let right: Branch | null;
    if (isRight) {
      left = this._root.left;
      right = this._root.right
        ? this.buildTree(this._root.right, path, value)
        : new LeafBranch(this.algorithm, path, value);
    } else {
      left = this._root.left
        ? this.buildTree(this._root.left, path, value)
        : new LeafBranch(this.algorithm, path, value);
      right = this._root.right;
    }

    this._root = new RootNode(this.algorithm, left, right);
  }

  public async getPath(path: bigint): Promise<MerkleTreePath> {
    const [hash, treePath] = await Promise.all([
      this._root.calculateHash(),
      SparseMerkleTree.generatePath(path, this._root.left, this._root.right),
    ]);

    return new MerkleTreePath(hash, treePath);
  }

  public toString(): string {
    return this._root.toString();
  }

  private buildTree(branch: Branch, remainingPath: bigint, value: Uint8Array): Branch {
    const commonPath = SparseMerkleTree.calculateCommonPath(remainingPath, branch.path);
    const isRight = (remainingPath >> commonPath.length) & 1n;

    if (commonPath.path === remainingPath) {
      throw new Error('Cannot add leaf inside branch.');
    }

    // If a leaf must be split from the middle
    if (branch instanceof LeafBranch) {
      if (commonPath.path === branch.path) {
        throw new Error('Cannot extend tree through leaf.');
      }

      const oldBranch = new LeafBranch(this.algorithm, branch.path >> commonPath.length, branch.value);
      const newBranch = new LeafBranch(this.algorithm, remainingPath >> commonPath.length, value);
      return new NodeBranch(
        this.algorithm,
        commonPath.path,
        isRight ? oldBranch : newBranch,
        isRight ? newBranch : oldBranch,
      );
    }

    // If node branch is split in the middle
    if (commonPath.path < branch.path) {
      const newBranch = new LeafBranch(this.algorithm, remainingPath >> commonPath.length, value);
      const oldBranch = new NodeBranch(this.algorithm, branch.path >> commonPath.length, branch.left, branch.right);
      return new NodeBranch(
        this.algorithm,
        commonPath.path,
        isRight ? oldBranch : newBranch,
        isRight ? newBranch : oldBranch,
      );
    }

    if (isRight) {
      return new NodeBranch(
        this.algorithm,
        branch.path,
        branch.left,
        this.buildTree(branch.right, remainingPath >> commonPath.length, value),
      );
    }

    return new NodeBranch(
      this.algorithm,
      branch.path,
      this.buildTree(branch.left, remainingPath >> commonPath.length, value),
      branch.right,
    );
  }
}
