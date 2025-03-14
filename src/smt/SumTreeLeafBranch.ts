import { DataHasher, IHashAlgorithm } from '../hash/DataHasher.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';
import { CoinData, CoinDataMap, CoinDataUtils } from './CoinData.js';

/**
 * Represents a leaf node in a Merkle Sum Tree
 * Contains a path, coin data map (coin ID to value), and a hash
 */
export class SumTreeLeafBranch {
  private readonly _coinData: CoinDataMap;
  
  /**
   * Constructor for a SumTreeLeafBranch
   * @param {bigint} path - The path identifier for this leaf
   * @param {CoinDataMap} coinData - Map of coin IDs to values
   * @param {Uint8Array} hash - The hash of this leaf
   */
  public constructor(
    public readonly path: bigint,
    coinData: CoinDataMap,
    private readonly _hash: Uint8Array,
  ) {
    this._coinData = new Map(coinData);
    this._hash = new Uint8Array(_hash);
  }

  /**
   * Gets the coin data map
   * @returns {CoinDataMap} The coin data map
   */
  public get coinData(): CoinDataMap {
    return new Map(this._coinData);
  }

  /**
   * Gets the hash of this leaf
   * @returns {Uint8Array} The hash
   */
  public get hash(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  /**
   * Creates a new SumTreeLeafBranch with the given parameters
   * @param {IHashAlgorithm} algorithm - The hash algorithm to use
   * @param {bigint} path - The path identifier for this leaf
   * @param {CoinDataMap} coinData - Map of coin IDs to values
   * @returns {Promise<SumTreeLeafBranch>} A new SumTreeLeafBranch
   */
  public static async create(
    algorithm: IHashAlgorithm,
    path: bigint,
    coinData: CoinDataMap,
  ): Promise<SumTreeLeafBranch> {
    const hasher = new DataHasher(algorithm).update(BigintConverter.encode(path));
    
    // Sort coin IDs for deterministic hashing
    const sortedKeys = Array.from(coinData.keys()).sort();
    
    // Add all coin IDs and values to the hash
    for (const key of sortedKeys) {
      const value = coinData.get(key);
      if (value !== undefined) {
        const coinId = HexConverter.decode(key);
        hasher.update(coinId);
        hasher.update(BigintConverter.encode(value));
      }
    }
    
    const hash = await hasher.digest();
    return new SumTreeLeafBranch(path, coinData, hash);
  }

  /**
   * Creates a string representation of this SumTreeLeafBranch
   * @returns {string} A string representation
   */
  public toString(): string {
    const coinDataStr = Array.from(this._coinData.entries())
      .map(([key, value]) => `${key}: ${value.toString()}`)
      .join(', ');
    
    return dedent`
      SumTreeLeafBranch[${this.path.toString(2)}]
        Hash: ${HexConverter.encode(this._hash)} 
        CoinData: {${coinDataStr}}`;
  }
}