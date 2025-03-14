import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

/**
 * Represents a coin with an ID and a value
 */
export class CoinData {
  /**
   * Constructor for a CoinData
   * @param {Uint8Array} coinId - The unique identifier for the coin
   * @param {bigint} value - The value associated with the coin
   */
  public constructor(
    private readonly _coinId: Uint8Array,
    private readonly _value: bigint,
  ) {
    this._coinId = new Uint8Array(_coinId);
  }

  /**
   * Gets the coin identifier
   * @returns {Uint8Array} The coin identifier
   */
  public get coinId(): Uint8Array {
    return new Uint8Array(this._coinId);
  }

  /**
   * Gets the coin value
   * @returns {bigint} The coin value
   */
  public get value(): bigint {
    return this._value;
  }

  /**
   * Creates a string representation of this CoinData
   * @returns {string} A string representation
   */
  public toString(): string {
    return dedent`
      CoinData:
        ID: ${HexConverter.encode(this._coinId)}
        Value: ${this._value.toString()}`;
  }
}

/**
 * A mapping of coin IDs to values
 */
export type CoinDataMap = Map<string, bigint>;

/**
 * Utility functions for working with CoinData
 */
export class CoinDataUtils {
  /**
   * Converts a CoinDataMap to an array of CoinData
   * @param {CoinDataMap} map - The map to convert
   * @returns {CoinData[]} Array of CoinData objects
   */
  public static mapToArray(map: CoinDataMap): CoinData[] {
    const coins: CoinData[] = [];
    for (const [idHex, value] of map.entries()) {
      coins.push(new CoinData(HexConverter.decode(idHex), value));
    }
    return coins;
  }

  /**
   * Converts an array of CoinData to a CoinDataMap
   * @param {CoinData[]} coins - Array of CoinData objects
   * @returns {CoinDataMap} Map of coin IDs to values
   */
  public static arrayToMap(coins: CoinData[]): CoinDataMap {
    const map = new Map<string, bigint>();
    for (const coin of coins) {
      map.set(HexConverter.encode(coin.coinId), coin.value);
    }
    return map;
  }

  /**
   * Merges two CoinDataMaps
   * @param {CoinDataMap} map1 - First map
   * @param {CoinDataMap} map2 - Second map
   * @returns {CoinDataMap} Merged map
   */
  public static mergeMaps(map1: CoinDataMap, map2: CoinDataMap): CoinDataMap {
    const result = new Map<string, bigint>(map1);
    for (const [key, value] of map2.entries()) {
      const existingValue = result.get(key) || 0n;
      result.set(key, existingValue + value);
    }
    return result;
  }
}