import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { MerkleTreePath, MerkleTreePathStep } from './MerkleTreePath.js';
import { NodeBranch } from './NodeBranch.js';
import { RootNode } from './RootNode.js';
import { IHashAlgorithm } from '../hash/DataHasher.js';

type CommonPath = { length: bigint; path: bigint };

export class SparseMerkleTree {
  public constructor(
    public readonly algorithm: IHashAlgorithm,
    private root: RootNode,
  ) {}

  public get rootHash(): Uint8Array {
    return this.root.hash;
  }

  public static async create(algorithm: IHashAlgorithm): Promise<SparseMerkleTree> {
    return new SparseMerkleTree(algorithm, await RootNode.create(algorithm, null, null));
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

  public async addLeaf(path: bigint, value: Uint8Array): Promise<void> {
    const isRight = path & 1n;
    let left: Branch | null;
    let right: Branch | null;
    if (isRight) {
      left = this.root.left;
      right = this.root.right
        ? await this.buildTree(this.root.right, path, value)
        : await LeafBranch.create(this.algorithm, path, value);
    } else {
      left = this.root.left
        ? await this.buildTree(this.root.left, path, value)
        : await LeafBranch.create(this.algorithm, path, value);
      right = this.root.right;
    }

    this.root = await RootNode.create(this.algorithm, left, right);
  }

  public getPath(path: bigint): MerkleTreePath {
    return {
      path: this.generatePath(path, this.root.left, this.root.right),
      root: this.rootHash,
    };
  }

  public toString(): string {
    return this.root.toString();
  }

  private generatePath(
    remainingPath: bigint,
    left: Branch | null,
    right: Branch | null,
  ): ReadonlyArray<MerkleTreePathStep> {
    const isRight = remainingPath & 1n;
    const branch = isRight ? right : left;
    const siblingBranch = isRight ? left : right;

    if (branch === null) {
      return [null];
    }

    const commonPath = SparseMerkleTree.calculateCommonPath(remainingPath, branch.path);

    if (branch.path === commonPath.path) {
      if (branch instanceof LeafBranch) {
        return [{ path: branch.path, sibling: siblingBranch?.hash, value: branch.value }];
      }

      // If path has ended, return the current non leaf branch data
      if (remainingPath >> commonPath.length === 1n) {
        return [{ path: branch.path, sibling: siblingBranch?.hash }];
      }

      return [
        ...this.generatePath(remainingPath >> commonPath.length, branch.left, branch.right),
        { path: branch.path, sibling: siblingBranch?.hash },
      ];
    }

    if (branch instanceof LeafBranch) {
      return [{ path: branch.path, sibling: siblingBranch?.hash, value: branch.value }];
    }

    return [{ path: branch.path, sibling: siblingBranch?.hash }];
  }

  private async buildTree(branch: Branch, remainingPath: bigint, value: Uint8Array): Promise<Branch> {
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

      const oldBranch = await LeafBranch.create(this.algorithm, branch.path >> commonPath.length, branch.value);
      const newBranch = await LeafBranch.create(this.algorithm, remainingPath >> commonPath.length, value);
      return NodeBranch.create(
        this.algorithm,
        commonPath.path,
        isRight ? oldBranch : newBranch,
        isRight ? newBranch : oldBranch,
      );
    }

    // If node branch is split in the middle
    if (commonPath.path < branch.path) {
      const newBranch = await LeafBranch.create(this.algorithm, remainingPath >> commonPath.length, value);
      const oldBranch = await NodeBranch.create(
        this.algorithm,
        branch.path >> commonPath.length,
        branch.left,
        branch.right,
      );
      return NodeBranch.create(
        this.algorithm,
        commonPath.path,
        isRight ? oldBranch : newBranch,
        isRight ? newBranch : oldBranch,
      );
    }

    if (isRight) {
      return NodeBranch.create(
        this.algorithm,
        branch.path,
        branch.left,
        await this.buildTree(branch.right, remainingPath >> commonPath.length, value),
      );
    }

    return NodeBranch.create(
      this.algorithm,
      branch.path,
      await this.buildTree(branch.left, remainingPath >> commonPath.length, value),
      branch.right,
    );
  }
}
