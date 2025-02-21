import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { NodeBranch } from './NodeBranch.js';
import { RootNode } from './RootNode.js';
import { IHashAlgorithm } from '../hash/DataHasher.js';
import { HexConverter } from '../util/HexConverter.js';

type PathStep = [string | null, bigint?] | Uint8Array | null;
type Path = ReadonlyArray<PathStep>;

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
    const tree = await this.buildTree(this.root, path, value);
    this.root = await RootNode.create(this.algorithm, tree.left, tree.right);
  }

  public getPath(path: bigint): Path {
    return this.generatePath(path, this.root, null);
  }

  public toString(): string {
    return this.root.toString();
  }

  private generatePath(remainingPath: bigint, branch: Branch | null, siblingBranch: Branch | null): Path {
    if (branch === null) {
      return [null];
    }

    const commonPath = SparseMerkleTree.calculateCommonPath(remainingPath, branch.path);
    const isRight = (remainingPath >> commonPath.length) & 1n;
    const siblingHash = siblingBranch ? HexConverter.encode(siblingBranch.hash) : null;

    if (branch.path === commonPath.path) {
      if (branch instanceof LeafBranch) {
        return [branch.value, [siblingHash, branch.path]];
      }

      // If path has ended, return the current non leaf branch data
      if (remainingPath >> commonPath.length === 1n) {
        return [branch.hash, [siblingHash, branch.path]];
      }

      return [
        ...this.generatePath(
          remainingPath >> commonPath.length,
          isRight ? branch.right : branch.left,
          isRight ? branch.left : branch.right,
        ),
        branch instanceof RootNode ? [HexConverter.encode(branch.hash)] : [siblingHash, branch.path],
      ];
    }

    if (branch instanceof LeafBranch) {
      return [branch.value, [siblingHash, branch.path]];
    }

    return [branch.hash, [siblingHash, branch.path]];
  }

  private buildTree(branch: Branch, remainingPath: bigint, value: Uint8Array): Promise<NodeBranch>;
  private buildTree(branch: null, remainingPath: bigint, value: Uint8Array): Promise<LeafBranch>;

  private async buildTree(branch: Branch | null, remainingPath: bigint, value: Uint8Array): Promise<Branch> {
    if (branch === null) {
      return await LeafBranch.create(this.algorithm, remainingPath, value);
    }

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
        await this.buildTree(branch.right!, remainingPath >> commonPath.length, value),
      );
    }

    return NodeBranch.create(
      this.algorithm,
      branch.path,
      await this.buildTree(branch.left!, remainingPath >> commonPath.length, value),
      branch.right,
    );
  }
}
