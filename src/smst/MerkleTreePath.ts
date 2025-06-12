import { IMerkleTreePathStepJson, MerkleTreePathStep } from './MerkleTreePathStep.js';
import { CborDecoder } from '../cbor/CborDecoder.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { dedent } from '../util/StringUtils.js';

export interface IMerkleTreePathJson {
  readonly root: string;
  readonly sum: string;
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
    public readonly sum: bigint,
    public readonly steps: ReadonlyArray<MerkleTreePathStep>,
  ) {}

  public static fromJSON(data: unknown): MerkleTreePath {
    if (!MerkleTreePath.isJSON(data)) {
      throw new Error('Parsing merkle tree path json failed.');
    }

    return new MerkleTreePath(
      DataHash.fromJSON(data.root),
      BigInt(data.sum),
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

    return new MerkleTreePath(
      DataHash.fromCBOR(data[0]),
      CborDecoder.readUnsignedInteger(data[1]),
      CborDecoder.readArray(data[2]).map((step) => MerkleTreePathStep.fromCBOR(step)),
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
      steps: this.steps.map((step) => step.toJSON()),
      sum: this.sum.toString(),
    };
  }

  public async verify(requestId: bigint): Promise<MerkleTreePathVerificationResult> {
    let currentPath = 1n;
    let currentHash: DataHash | null = null;
    let currentSum = this.steps.at(0)?.branch?.sum ?? 0n;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      let hash: DataHash | null = null;
      if (step.branch !== null) {
        const bytes: Uint8Array | null = i === 0 ? step.branch.value : currentHash ? currentHash.imprint : null;
        hash = await new DataHasher(HashAlgorithm.SHA256)
          .update(
            CborEncoder.encodeArray([
              CborEncoder.encodeUnsignedInteger(step.path),
              bytes ? CborEncoder.encodeByteString(bytes) : CborEncoder.encodeNull(),
              CborEncoder.encodeUnsignedInteger(currentSum),
            ]),
          )
          .digest();

        const length = BigInt(step.path.toString(2).length - 1);
        currentPath = (currentPath << length) | (step.path & ((1n << length) - 1n));
      }

      const isRight = step.path & 1n;
      const right: [DataHash, bigint] | null = isRight
        ? hash
          ? [hash, currentSum]
          : null
        : step.sibling
          ? [step.sibling.hash, step.sibling.sum]
          : null;
      const left: [DataHash, bigint] | null = isRight
        ? step.sibling
          ? [step.sibling.hash, step.sibling.sum]
          : null
        : hash
          ? [hash, currentSum]
          : null;

      currentHash = await new DataHasher(HashAlgorithm.SHA256)
        .update(
          CborEncoder.encodeArray([
            left
              ? CborEncoder.encodeArray([
                  CborEncoder.encodeByteString(left[0].imprint),
                  CborEncoder.encodeUnsignedInteger(left[1]),
                ])
              : CborEncoder.encodeNull(),
            right
              ? CborEncoder.encodeArray([
                  right[0] ? CborEncoder.encodeByteString(right[0].imprint) : CborEncoder.encodeNull(),
                  CborEncoder.encodeUnsignedInteger(right[1]),
                ])
              : CborEncoder.encodeNull(),
          ]),
        )
        .digest();
      currentSum += step.sibling?.sum ?? 0n;
    }

    return new MerkleTreePathVerificationResult(
      !!currentHash && this.root.equals(currentHash) && currentSum === this.sum,
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
