import { DataHasher, HashAlgorithm } from '../hash/DataHasher.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';
import { CoinDataMap } from './CoinData.js';
import { IMerkleSumTreePathStepDto, MerkleSumTreePathStep } from './MerkleSumTreePathStep.js';

/**
 * Data transfer object for a Merkle Sum Tree path
 */
export interface IMerkleSumTreePathDto {
  readonly root: string;
  readonly steps: ReadonlyArray<IMerkleSumTreePathStepDto | null>;
}

/**
 * Result of a Merkle Sum Tree path verification
 */
export class MerkleSumTreePathVerificationResult {
  public readonly result: boolean;

  /**
   * Constructor for a MerkleSumTreePathVerificationResult
   * @param {boolean} isPathValid - True if the path is valid
   * @param {boolean} isPathIncluded - True if the path is included in the tree
   * @param {CoinDataMap} coinData - The coin data at the requested path
   */
  public constructor(
    public readonly isPathValid: boolean,
    public readonly isPathIncluded: boolean,
    public readonly coinData: CoinDataMap | null,
  ) {
    this.result = isPathValid && isPathIncluded;
  }
}

/**
 * Represents a proof path in a Merkle Sum Tree
 */
export class MerkleSumTreePath {
  /**
   * Constructor for a MerkleSumTreePath
   * @param {Uint8Array} _root - The root hash
   * @param {ReadonlyArray<MerkleSumTreePathStep | null>} steps - The steps in the path
   */
  public constructor(
    private readonly _root: Uint8Array,
    public readonly steps: ReadonlyArray<MerkleSumTreePathStep | null>,
  ) {
    this._root = new Uint8Array(_root);
  }

  /**
   * Gets the root hash
   * @returns {Uint8Array} The root hash
   */
  public get root(): Uint8Array {
    return new Uint8Array(this._root);
  }

  /**
   * Deserializes a MerkleSumTreePath from a DTO
   * @param {unknown} data - The DTO data
   * @returns {MerkleSumTreePath} A deserialized MerkleSumTreePath
   */
  public static fromDto(data: unknown): MerkleSumTreePath {
    if (!MerkleSumTreePath.isDto(data)) {
      throw new Error('Parsing merkle sum tree path dto failed.');
    }

    return new MerkleSumTreePath(
      HexConverter.decode(data.root),
      data.steps.map((step: unknown) => MerkleSumTreePathStep.fromDto(step)),
    );
  }

  /**
   * Validates if the given data is a valid DTO
   * @param {unknown} data - The data to validate
   * @returns {boolean} True if data is a valid DTO
   */
  public static isDto(data: unknown): data is IMerkleSumTreePathDto {
    return (
      data instanceof Object &&
      'root' in data &&
      typeof data.root === 'string' &&
      'steps' in data &&
      Array.isArray(data.steps)
    );
  }

  /**
   * Serializes this MerkleSumTreePath to a DTO
   * @returns {IMerkleSumTreePathDto} The serialized DTO
   */
  public toDto(): IMerkleSumTreePathDto {
    return {
      root: HexConverter.encode(this.root),
      steps: this.steps.map((step) => (step ? step.toDto() : null)),
    };
  }

  /**
   * Verifies this path for a given request ID
   * @param {bigint} requestId - The ID to verify
   * @returns {Promise<MerkleSumTreePathVerificationResult>} The verification result
   */
  public async verify(requestId: bigint): Promise<MerkleSumTreePathVerificationResult> {
    let currentPath = 1n;
    let currentHash: Uint8Array | null = null;
    let leafCoinData: CoinDataMap | null = null;

    for (const step of this.steps) {
      if (step == null) {
        currentHash = await new DataHasher(HashAlgorithm.SHA256).update(new Uint8Array(1)).digest();
        continue;
      }

      let hash: Uint8Array;
      if (step.value) {
        // This is a leaf step
        leafCoinData = step.value;
        
        // Hash the path and coin data
        const hasher = new DataHasher(HashAlgorithm.SHA256);
        hasher.update(BigintConverter.encode(step.path));
        
        // Sort coin IDs for deterministic hashing
        const sortedKeys = Array.from(step.value.keys()).sort();
        
        // Add all coin IDs and values to the hash
        for (const key of sortedKeys) {
          const value = step.value.get(key);
          if (value !== undefined) {
            const coinId = HexConverter.decode(key);
            hasher.update(coinId);
            hasher.update(BigintConverter.encode(value));
          }
        }
        
        hash = await hasher.digest();
      } else {
        // This is an internal node step
        hash = await new DataHasher(HashAlgorithm.SHA256)
          .update(BigintConverter.encode(step.path))
          .update(currentHash ?? new Uint8Array(1))
          .digest();
      }

      const siblingHash = step.sibling ?? new Uint8Array(1);
      const isRight = step.path & 1n;
      currentHash = await new DataHasher(HashAlgorithm.SHA256)
        .update(isRight ? siblingHash : hash)
        .update(isRight ? hash : siblingHash)
        .digest();
      const length = BigInt(step.path.toString(2).length - 1);
      currentPath = (currentPath << length) | (step.path & ((1n << length) - 1n));
    }

    return new MerkleSumTreePathVerificationResult(
      !!currentHash && HexConverter.encode(currentHash) === HexConverter.encode(this.root),
      requestId === currentPath,
      leafCoinData,
    );
  }

  /**
   * Creates a string representation of this MerkleSumTreePath
   * @returns {string} A string representation
   */
  public toString(): string {
    return dedent`
      Merkle Sum Tree Path
        Root: ${HexConverter.encode(this._root)} 
        Steps: [\n${this.steps.map((step: MerkleSumTreePathStep | null) => step?.toString() ?? 'null').join('\n')}\n]`;
  }
}