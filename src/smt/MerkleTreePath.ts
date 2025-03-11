import { IMerkleTreePathStepDto, MerkleTreePathStep } from './MerkleTreePathStep.js';
import { DataHasher, HashAlgorithm } from '../hash/DataHasher.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export interface IMerkleTreePathDto {
  readonly root: string;
  readonly steps: ReadonlyArray<IMerkleTreePathStepDto | null>;
}

export class MerkleTreePathVerificationResult {
  public readonly result: boolean;

  public constructor(
    public readonly isPathValid: boolean,
    public readonly isPathIncluded: boolean,
  ) {
    this.result = isPathValid && isPathIncluded;
  }
}

export class MerkleTreePath {
  public constructor(
    private readonly _root: Uint8Array,
    public readonly steps: ReadonlyArray<MerkleTreePathStep | null>,
  ) {
    this._root = new Uint8Array(_root);
  }

  public get root(): Uint8Array {
    return new Uint8Array(this._root);
  }

  public static fromDto(data: unknown): MerkleTreePath {
    if (!MerkleTreePath.isDto(data)) {
      throw new Error('Parsing merkle tree path dto failed.');
    }

    return new MerkleTreePath(
      HexConverter.decode(data.root),
      data.steps.map((step: unknown) => MerkleTreePathStep.fromDto(step)),
    );
  }

  public static isDto(data: unknown): data is IMerkleTreePathDto {
    return (
      data instanceof Object &&
      'root' in data &&
      typeof data.root === 'string' &&
      'path' in data &&
      Array.isArray(data.path)
    );
  }

  public toDto(): IMerkleTreePathDto {
    return {
      root: HexConverter.encode(this.root),
      steps: this.steps.map((step) => (step ? step.toDto() : null)),
    };
  }

  // TODO: Revisit verification logic at some point
  public async verify(requestId: bigint): Promise<MerkleTreePathVerificationResult> {
    let currentPath = 1n;
    let currentHash: Uint8Array | null = null;

    for (const step of this.steps) {
      if (step == null) {
        currentHash = await new DataHasher(HashAlgorithm.SHA256).update(new Uint8Array(1)).digest();
        continue;
      }

      let hash: Uint8Array;
      if (step.value) {
        hash = await new DataHasher(HashAlgorithm.SHA256)
          .update(BigintConverter.encode(step.path))
          .update(step.value)
          .digest();
      } else {
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

    return new MerkleTreePathVerificationResult(
      !!currentHash && HexConverter.encode(currentHash) === HexConverter.encode(this.root),
      requestId === currentPath,
    );
  }

  public toString(): string {
    return dedent`
      Merkle Tree Path
        Root: ${HexConverter.encode(this._root)} 
        Steps: [\n${this.steps.map((step: MerkleTreePathStep | null) => step?.toString() ?? 'null').join('\n')}\n]`;
  }
}
