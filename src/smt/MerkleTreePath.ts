import { IMerkleTreePathStepJson, MerkleTreePathStep } from './MerkleTreePathStep.js';
import { CborDecoder } from '../cbor/CborDecoder.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { dedent } from '../util/StringUtils.js';

export interface IMerkleTreePathJson {
  readonly root: string;
  readonly steps: ReadonlyArray<IMerkleTreePathStepJson>;
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
    public readonly root: DataHash,
    public readonly steps: ReadonlyArray<MerkleTreePathStep>,
  ) {}

  public static fromJSON(data: unknown): MerkleTreePath {
    if (!MerkleTreePath.isJSON(data)) {
      throw new Error('Parsing merkle tree path json failed.');
    }

    return new MerkleTreePath(
      DataHash.fromJSON(data.root),
      data.steps.map((step: unknown) => MerkleTreePathStep.fromJSON(step)),
    );
  }

  public static isJSON(data: unknown): data is IMerkleTreePathJson {
    return (
      typeof data === 'object' &&
      data !== null &&
      'root' in data &&
      typeof data.root === 'string' &&
      'steps' in data &&
      Array.isArray(data.steps)
    );
  }

  public static fromCBOR(bytes: Uint8Array): MerkleTreePath {
    const data = CborDecoder.readArray(bytes);
    const steps = CborDecoder.readArray(data[1]);

    return new MerkleTreePath(
      DataHash.fromCBOR(data[0]),
      steps.map((step) => MerkleTreePathStep.fromCBOR(step)),
    );
  }

  public toCBOR(): Uint8Array {
    return CborEncoder.encodeArray([
      this.root.toCBOR(),
      CborEncoder.encodeArray(this.steps.map((step: MerkleTreePathStep) => step.toCBOR())),
    ]);
  }

  public toJSON(): IMerkleTreePathJson {
    return {
      root: this.root.toJSON(),
      steps: this.steps.map((step) => (step ? step.toJSON() : step)),
    };
  }

  // TODO: Revisit verification logic at some point
  public async verify(requestId: bigint): Promise<MerkleTreePathVerificationResult> {
    let currentPath = 1n;
    let currentHash: DataHash | null = null;

    for (const step of this.steps) {
      let hash: Uint8Array;
      if (step.branch === null) {
        hash = new Uint8Array(1);
      } else {
        if (step.branch.value === null) {
          const digest = await new DataHasher(HashAlgorithm.SHA256)
            .update(BigintConverter.encode(step.path))
            .update(currentHash?.data ?? new Uint8Array(1))
            .digest();
          hash = digest.data;
        } else {
          const digest = await new DataHasher(HashAlgorithm.SHA256)
            .update(BigintConverter.encode(step.path))
            .update(step.branch.value)
            .digest();
          hash = digest.data;
        }

        const length = BigInt(step.path.toString(2).length - 1);
        currentPath = (currentPath << length) | (step.path & ((1n << length) - 1n));
      }

      const siblingHash = step.sibling?.data ?? new Uint8Array(1);
      const isRight = step.path & 1n;
      currentHash = await new DataHasher(HashAlgorithm.SHA256)
        .update(isRight ? siblingHash : hash)
        .update(isRight ? hash : siblingHash)
        .digest();
    }

    return new MerkleTreePathVerificationResult(
      !!currentHash && this.root.equals(currentHash),
      requestId === currentPath,
    );
  }

  public toString(): string {
    return dedent`
      Merkle Tree Path
        Root: ${this.root.toString()} 
        Steps: [
          ${this.steps.map((step: MerkleTreePathStep | null) => step?.toString() ?? 'null').join('\n')}
        ]`;
  }
}
