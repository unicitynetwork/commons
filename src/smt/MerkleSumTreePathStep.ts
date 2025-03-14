import { CoinDataMap, CoinDataUtils } from './CoinData.js';
import { SumTreeBranch } from './SumTreeBranch.js';
import { SumTreeLeafBranch } from './SumTreeLeafBranch.js';
import { SumTreeNodeBranch } from './SumTreeNodeBranch.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

/**
 * Data transfer object for a Merkle Sum Tree path step
 */
export interface IMerkleSumTreePathStepDto {
  readonly path: string;
  readonly value?: { [key: string]: string }; // Map of coin ID hex to value string
  readonly sibling?: string;
  readonly siblingCoinData?: { [key: string]: string }; // Map of coin ID hex to value string
}

/**
 * Represents a step in a Merkle Sum Tree proof path
 */
export class MerkleSumTreePathStep {
  private readonly _value: CoinDataMap | null;
  private readonly _sibling: Uint8Array | null;
  private readonly _siblingCoinData: CoinDataMap | null;
  
  /**
   * Constructor for a MerkleSumTreePathStep
   * @param {bigint} path - The path for this step
   * @param {CoinDataMap | null} value - The coin data if this is a leaf
   * @param {Uint8Array | null} sibling - The hash of the sibling node
   * @param {CoinDataMap | null} siblingCoinData - The coin data of the sibling node
   */
  public constructor(
    public readonly path: bigint,
    value: CoinDataMap | null,
    sibling: Uint8Array | null,
    siblingCoinData: CoinDataMap | null,
  ) {
    this._value = value ? new Map(value) : null;
    this._sibling = sibling ? new Uint8Array(sibling) : null;
    this._siblingCoinData = siblingCoinData ? new Map(siblingCoinData) : null;
  }

  /**
   * Gets the coin data value if this is a leaf
   * @returns {CoinDataMap | null} The coin data or null
   */
  public get value(): CoinDataMap | null {
    return this._value ? new Map(this._value) : null;
  }

  /**
   * Gets the sibling hash
   * @returns {Uint8Array | null} The sibling hash or null
   */
  public get sibling(): Uint8Array | null {
    return this._sibling ? new Uint8Array(this._sibling) : null;
  }

  /**
   * Gets the sibling coin data
   * @returns {CoinDataMap | null} The sibling coin data or null
   */
  public get siblingCoinData(): CoinDataMap | null {
    return this._siblingCoinData ? new Map(this._siblingCoinData) : null;
  }

  /**
   * Creates a MerkleSumTreePathStep from a leaf branch
   * @param {SumTreeLeafBranch} branch - The leaf branch
   * @param {SumTreeBranch | null} sibling - The sibling branch
   * @returns {MerkleSumTreePathStep} A new MerkleSumTreePathStep
   */
  public static createFromLeaf(
    branch: SumTreeLeafBranch,
    sibling: SumTreeBranch | null,
  ): MerkleSumTreePathStep {
    return new MerkleSumTreePathStep(
      branch.path,
      branch.coinData,
      sibling?.hash ?? null,
      sibling?.coinData ?? null,
    );
  }

  /**
   * Creates a MerkleSumTreePathStep from a node branch
   * @param {SumTreeNodeBranch} branch - The node branch
   * @param {SumTreeBranch | null} sibling - The sibling branch
   * @returns {MerkleSumTreePathStep} A new MerkleSumTreePathStep
   */
  public static createFromBranch(
    branch: SumTreeNodeBranch,
    sibling: SumTreeBranch | null,
  ): MerkleSumTreePathStep {
    return new MerkleSumTreePathStep(
      branch.path,
      null,
      sibling?.hash ?? null,
      sibling?.coinData ?? null,
    );
  }

  /**
   * Deserializes a MerkleSumTreePathStep from a DTO
   * @param {unknown} data - The DTO data
   * @returns {MerkleSumTreePathStep} A deserialized MerkleSumTreePathStep
   */
  public static fromDto(data: unknown): MerkleSumTreePathStep {
    if (!MerkleSumTreePathStep.isDto(data)) {
      throw new Error('Parsing merkle sum tree path step failed.');
    }

    // Convert value object to CoinDataMap if it exists
    let valueMap: CoinDataMap | null = null;
    if (data.value) {
      valueMap = new Map<string, bigint>();
      for (const [key, valueStr] of Object.entries(data.value)) {
        valueMap.set(key, BigInt(valueStr));
      }
    }

    // Convert siblingCoinData object to CoinDataMap if it exists
    let siblingCoinDataMap: CoinDataMap | null = null;
    if (data.siblingCoinData) {
      siblingCoinDataMap = new Map<string, bigint>();
      for (const [key, valueStr] of Object.entries(data.siblingCoinData)) {
        siblingCoinDataMap.set(key, BigInt(valueStr));
      }
    }

    return new MerkleSumTreePathStep(
      BigInt(data.path),
      valueMap,
      data.sibling == null ? null : HexConverter.decode(data.sibling),
      siblingCoinDataMap,
    );
  }

  /**
   * Validates if the given data is a valid DTO
   * @param {unknown} data - The data to validate
   * @returns {boolean} True if data is a valid DTO
   */
  public static isDto(data: unknown): data is IMerkleSumTreePathStepDto {
    return (
      data instanceof Object &&
      'path' in data &&
      typeof data.path === 'string' &&
      (!('value' in data) || data.value === undefined || data.value === null || 
        (typeof data.value === 'object' && data.value !== null)) &&
      (!('sibling' in data) || data.sibling === undefined || data.sibling === null ||
        typeof data.sibling === 'string') &&
      (!('siblingCoinData' in data) || data.siblingCoinData === undefined || 
        data.siblingCoinData === null || (typeof data.siblingCoinData === 'object' && 
        data.siblingCoinData !== null))
    );
  }

  /**
   * Serializes this MerkleSumTreePathStep to a DTO
   * @returns {IMerkleSumTreePathStepDto} The serialized DTO
   */
  public toDto(): IMerkleSumTreePathStepDto {
    let dto: IMerkleSumTreePathStepDto = {
      path: this.path.toString(),
    };

    // Convert value CoinDataMap to object if it exists
    if (this._value) {
      const valueObj: { [key: string]: string } = {};
      for (const [key, value] of this._value.entries()) {
        valueObj[key] = value.toString();
      }
      dto = {
        ...dto,
        value: valueObj,
      };
    }

    // Add sibling hash if it exists
    if (this._sibling) {
      dto = {
        ...dto,
        sibling: HexConverter.encode(this._sibling),
      };
    }

    // Convert siblingCoinData CoinDataMap to object if it exists
    if (this._siblingCoinData) {
      const siblingCoinDataObj: { [key: string]: string } = {};
      for (const [key, value] of this._siblingCoinData.entries()) {
        siblingCoinDataObj[key] = value.toString();
      }
      dto = {
        ...dto,
        siblingCoinData: siblingCoinDataObj,
      };
    }

    return dto;
  }

  /**
   * Creates a string representation of this MerkleSumTreePathStep
   * @returns {string} A string representation
   */
  public toString(): string {
    let valueStr = 'null';
    if (this._value) {
      valueStr = Array.from(this._value.entries())
        .map(([key, value]) => `${key}: ${value.toString()}`)
        .join(', ');
    }

    let siblingCoinDataStr = 'null';
    if (this._siblingCoinData) {
      siblingCoinDataStr = Array.from(this._siblingCoinData.entries())
        .map(([key, value]) => `${key}: ${value.toString()}`)
        .join(', ');
    }

    return dedent`
      Merkle Sum Tree Path Step
        Path: ${this.path}
        Value: {${valueStr}}
        Sibling: ${this._sibling ? HexConverter.encode(this._sibling) : 'null'}
        SiblingCoinData: {${siblingCoinDataStr}}`;
  }
}