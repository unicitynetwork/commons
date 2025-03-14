import { CoinData, CoinDataMap } from './CoinData.js';
import { MerkleSumTreePath } from './MerkleSumTreePath.js';
import { MerkleSumTreePathStep } from './MerkleSumTreePathStep.js';
import { SumTreeBranch } from './SumTreeBranch.js';
import { SumTreeLeafBranch } from './SumTreeLeafBranch.js';
import { SumTreeNodeBranch } from './SumTreeNodeBranch.js';
import { SumTreeRootNode } from './SumTreeRootNode.js';
import { IHashAlgorithm } from '../hash/DataHasher.js';

type CommonPath = { length: bigint; path: bigint };

/**
 * A Merkle Sum Tree implementation
 * - leaf nodes contain a mapping of coin IDs to values
 * - non-leaf nodes contain sums of their children's coin values
 * - inclusion proofs contain coin values from neighbors
 */
export class SumTree {
  /**
   * Constructor for a SumTree
   * @param {IHashAlgorithm} algorithm - The hash algorithm to use
   * @param {SumTreeRootNode} root - The root node
   */
  public constructor(
    public readonly algorithm: IHashAlgorithm,
    private root: SumTreeRootNode,
  ) {}

  /**
   * Gets the root hash
   * @returns {Uint8Array} The root hash
   */
  public get rootHash(): Uint8Array {
    return this.root.hash;
  }

  /**
   * Gets the coin data at the root
   * @returns {CoinDataMap} The coin data
   */
  public get coinData(): CoinDataMap {
    return this.root.coinData;
  }

  /**
   * Creates a new SumTree
   * @param {IHashAlgorithm} algorithm - The hash algorithm to use
   * @returns {Promise<SumTree>} A new SumTree
   */
  public static async create(algorithm: IHashAlgorithm): Promise<SumTree> {
    const root = await SumTreeRootNode.create(algorithm, null, null);
    return new SumTree(algorithm, root);
  }

  /**
   * Calculates the common path between two paths
   * @param {bigint} path1 - First path
   * @param {bigint} path2 - Second path
   * @returns {CommonPath} The common path
   */
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

  /**
   * Adds a leaf to the tree
   * @param {bigint} path - The path to add at
   * @param {CoinDataMap} coinData - The coin data to add
   * @returns {Promise<void>}
   */
  public async addLeaf(path: bigint, coinData: CoinDataMap): Promise<void> {
    const isRight = path & 1n;
    let left: SumTreeBranch | null;
    let right: SumTreeBranch | null;
    
    if (isRight) {
      left = this.root.left;
      right = this.root.right
        ? await this.buildTree(this.root.right, path, coinData)
        : await SumTreeLeafBranch.create(this.algorithm, path, coinData);
    } else {
      left = this.root.left
        ? await this.buildTree(this.root.left, path, coinData)
        : await SumTreeLeafBranch.create(this.algorithm, path, coinData);
      right = this.root.right;
    }

    this.root = await SumTreeRootNode.create(this.algorithm, left, right);
  }

  /**
   * Gets a proof path for a given path
   * @param {bigint} path - The path to get a proof for
   * @returns {MerkleSumTreePath} The proof path
   */
  public getPath(path: bigint): MerkleSumTreePath {
    return new MerkleSumTreePath(
      this.rootHash,
      this.generatePath(path, this.root.left, this.root.right)
    );
  }

  /**
   * Gets the coin value for a specific coin ID
   * @param {Uint8Array} coinId - The coin ID to look up
   * @returns {bigint} The coin value, or 0n if not found
   */
  public getCoinValue(coinId: Uint8Array): bigint {
    const idHex = HexConverter.encode(coinId);
    return this.root.coinData.get(idHex) || 0n;
  }

  /**
   * Gets the total value of all coins
   * @returns {bigint} The total value
   */
  public getTotalValue(): bigint {
    let total = 0n;
    for (const value of this.root.coinData.values()) {
      total += value;
    }
    return total;
  }

  /**
   * Creates a string representation of this SumTree
   * @returns {string} A string representation
   */
  public toString(): string {
    return this.root.toString();
  }

  /**
   * Generates a proof path for a given path
   * @param {bigint} remainingPath - The path to generate a proof for
   * @param {SumTreeBranch | null} left - The left branch
   * @param {SumTreeBranch | null} right - The right branch
   * @returns {ReadonlyArray<MerkleSumTreePathStep | null>} The proof path steps
   * @private
   */
  private generatePath(
    remainingPath: bigint,
    left: SumTreeBranch | null,
    right: SumTreeBranch | null,
  ): ReadonlyArray<MerkleSumTreePathStep | null> {
    const isRight = remainingPath & 1n;
    const branch = isRight ? right : left;
    const siblingBranch = isRight ? left : right;

    if (branch === null) {
      return [null];
    }

    const commonPath = SumTree.calculateCommonPath(remainingPath, branch.path);

    if (branch.path === commonPath.path) {
      if (branch instanceof SumTreeLeafBranch) {
        return [MerkleSumTreePathStep.createFromLeaf(branch, siblingBranch)];
      }

      // If path has ended, return the current non leaf branch data
      if (remainingPath >> commonPath.length === 1n) {
        return [MerkleSumTreePathStep.createFromBranch(branch, siblingBranch)];
      }

      return [
        ...this.generatePath(remainingPath >> commonPath.length, branch.left, branch.right),
        MerkleSumTreePathStep.createFromBranch(branch, siblingBranch),
      ];
    }

    if (branch instanceof SumTreeLeafBranch) {
      return [MerkleSumTreePathStep.createFromLeaf(branch, siblingBranch)];
    }

    return [MerkleSumTreePathStep.createFromBranch(branch, siblingBranch)];
  }

  /**
   * Builds a tree by adding a leaf
   * @param {SumTreeBranch} branch - The branch to modify
   * @param {bigint} remainingPath - The remaining path
   * @param {CoinDataMap} coinData - The coin data to add
   * @returns {Promise<SumTreeBranch>} The modified branch
   * @private
   */
  private async buildTree(
    branch: SumTreeBranch,
    remainingPath: bigint,
    coinData: CoinDataMap,
  ): Promise<SumTreeBranch> {
    const commonPath = SumTree.calculateCommonPath(remainingPath, branch.path);
    const isRight = (remainingPath >> commonPath.length) & 1n;

    if (commonPath.path === remainingPath) {
      throw new Error('Cannot add leaf inside branch.');
    }

    // If a leaf must be split from the middle
    if (branch instanceof SumTreeLeafBranch) {
      if (commonPath.path === branch.path) {
        throw new Error('Cannot extend tree through leaf.');
      }

      const oldBranch = await SumTreeLeafBranch.create(
        this.algorithm,
        branch.path >> commonPath.length,
        branch.coinData,
      );
      
      const newBranch = await SumTreeLeafBranch.create(
        this.algorithm,
        remainingPath >> commonPath.length,
        coinData,
      );
      
      return SumTreeNodeBranch.create(
        this.algorithm,
        commonPath.path,
        isRight ? oldBranch : newBranch,
        isRight ? newBranch : oldBranch,
      );
    }

    // If node branch is split in the middle
    if (commonPath.path < branch.path) {
      const newBranch = await SumTreeLeafBranch.create(
        this.algorithm,
        remainingPath >> commonPath.length,
        coinData,
      );
      
      const oldBranch = await SumTreeNodeBranch.create(
        this.algorithm,
        branch.path >> commonPath.length,
        branch.left,
        branch.right,
      );
      
      return SumTreeNodeBranch.create(
        this.algorithm,
        commonPath.path,
        isRight ? oldBranch : newBranch,
        isRight ? newBranch : oldBranch,
      );
    }

    if (isRight) {
      return SumTreeNodeBranch.create(
        this.algorithm,
        branch.path,
        branch.left,
        await this.buildTree(branch.right, remainingPath >> commonPath.length, coinData),
      );
    }

    return SumTreeNodeBranch.create(
      this.algorithm,
      branch.path,
      await this.buildTree(branch.left, remainingPath >> commonPath.length, coinData),
      branch.right,
    );
  }
}

// Re-export the HexConverter for convenience when working with coin IDs
import { HexConverter } from '../util/HexConverter.js';