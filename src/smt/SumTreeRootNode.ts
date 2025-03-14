import { DataHasher, IHashAlgorithm } from '../hash/DataHasher.js';
import { CoinDataMap, CoinDataUtils } from './CoinData.js';
import { SumTreeBranch } from './SumTreeBranch.js';

/**
 * Represents the root node of a Merkle Sum Tree
 */
export class SumTreeRootNode {
  private readonly _coinData: CoinDataMap;
  
  /**
   * Constructor for a SumTreeRootNode
   * @param {SumTreeBranch} left - The left child branch
   * @param {SumTreeBranch} right - The right child branch
   * @param {CoinDataMap} coinData - Combined coin data from both children
   * @param {Uint8Array} hash - The hash of the root node
   */
  public constructor(
    public readonly left: SumTreeBranch | null,
    public readonly right: SumTreeBranch | null,
    coinData: CoinDataMap,
    private readonly _hash: Uint8Array,
  ) {
    this._coinData = new Map(coinData);
    this._hash = new Uint8Array(_hash);
  }

  /**
   * Gets the path of this root node (always 1n)
   * @returns {bigint} The path (1n)
   */
  public get path(): bigint {
    return 1n;
  }

  /**
   * Gets the combined coin data map
   * @returns {CoinDataMap} The coin data map
   */
  public get coinData(): CoinDataMap {
    return new Map(this._coinData);
  }

  /**
   * Gets the hash of this root node
   * @returns {Uint8Array} The hash
   */
  public get hash(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  /**
   * Creates a new SumTreeRootNode with the given parameters
   * @param {IHashAlgorithm} algorithm - The hash algorithm to use
   * @param {SumTreeBranch | null} left - The left child branch
   * @param {SumTreeBranch | null} right - The right child branch
   * @returns {Promise<SumTreeRootNode>} A new SumTreeRootNode
   */
  public static async create(
    algorithm: IHashAlgorithm,
    left: SumTreeBranch | null,
    right: SumTreeBranch | null,
  ): Promise<SumTreeRootNode> {
    // Combine coin data from left and right children
    const leftCoinData = left?.coinData ?? new Map<string, bigint>();
    const rightCoinData = right?.coinData ?? new Map<string, bigint>();
    const combinedCoinData = CoinDataUtils.mergeMaps(leftCoinData, rightCoinData);
    
    // Calculate hash from left and right hashes
    const hash = await new DataHasher(algorithm)
      .update(left?.hash ?? new Uint8Array(1))
      .update(right?.hash ?? new Uint8Array(1))
      .digest();
    
    return new SumTreeRootNode(left, right, combinedCoinData, hash);
  }

  /**
   * Creates a string representation of this SumTreeRootNode
   * @returns {string} A string representation
   */
  public toString(): string {
    return `SumTree Root[${Object.keys(this._coinData).length} coins]`;
  }
}