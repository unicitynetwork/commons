import { DataHasher, IHashAlgorithm } from '../hash/DataHasher.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';
import { CoinDataMap, CoinDataUtils } from './CoinData.js';
import { SumTreeBranch } from './SumTreeBranch.js';

/**
 * Represents an internal node in a Merkle Sum Tree
 * Contains a path, left and right children, combined coin data, and a hash
 */
export class SumTreeNodeBranch {
  private readonly _coinData: CoinDataMap;
  
  /**
   * Constructor for a SumTreeNodeBranch
   * @param {bigint} path - The path identifier for this node
   * @param {SumTreeBranch} left - The left child branch
   * @param {SumTreeBranch} right - The right child branch
   * @param {CoinDataMap} coinData - Combined coin data map from both children
   * @param {Uint8Array} hash - The hash of this node
   */
  public constructor(
    public readonly path: bigint,
    public readonly left: SumTreeBranch,
    public readonly right: SumTreeBranch,
    coinData: CoinDataMap,
    private readonly _hash: Uint8Array,
  ) {
    this._coinData = new Map(coinData);
    this._hash = new Uint8Array(_hash);
  }

  /**
   * Gets the combined coin data map
   * @returns {CoinDataMap} The coin data map
   */
  public get coinData(): CoinDataMap {
    return new Map(this._coinData);
  }

  /**
   * Gets the hash of this node
   * @returns {Uint8Array} The hash
   */
  public get hash(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  /**
   * Creates a new SumTreeNodeBranch with the given parameters
   * @param {IHashAlgorithm} algorithm - The hash algorithm to use
   * @param {bigint} path - The path identifier for this node
   * @param {SumTreeBranch} left - The left child branch
   * @param {SumTreeBranch} right - The right child branch
   * @returns {Promise<SumTreeNodeBranch>} A new SumTreeNodeBranch
   */
  public static async create(
    algorithm: IHashAlgorithm,
    path: bigint,
    left: SumTreeBranch,
    right: SumTreeBranch,
  ): Promise<SumTreeNodeBranch> {
    // Combine coin data from left and right children
    const leftCoinData = left?.coinData ?? new Map<string, bigint>();
    const rightCoinData = right?.coinData ?? new Map<string, bigint>();
    const combinedCoinData = CoinDataUtils.mergeMaps(leftCoinData, rightCoinData);
    
    // Hash the children's hashes
    const childrenHash = await new DataHasher(algorithm)
      .update(left?.hash ?? new Uint8Array(1))
      .update(right?.hash ?? new Uint8Array(1))
      .digest();
    
    // Create the final hash using path and children's hash
    const hash = await new DataHasher(algorithm)
      .update(BigintConverter.encode(path))
      .update(childrenHash)
      .digest();
    
    return new SumTreeNodeBranch(path, left, right, combinedCoinData, hash);
  }

  /**
   * Creates a string representation of this SumTreeNodeBranch
   * @returns {string} A string representation
   */
  public toString(): string {
    const coinDataStr = Array.from(this._coinData.entries())
      .map(([key, value]) => `${key}: ${value.toString()}`)
      .join(', ');
    
    return dedent`
      SumTreeNodeBranch[${this.path.toString(2)}]
        Hash: ${HexConverter.encode(this._hash)}
        CoinData: {${coinDataStr}}
        Left: 
          ${this.left?.toString() ?? 'null'}
        Right: 
          ${this.right?.toString() ?? 'null'}`;
  }
}