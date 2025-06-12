import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { CborDecoder } from '../cbor/CborDecoder.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { DataHash } from '../hash/DataHash.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

type MerkleTreePathStepSiblingJson = [string, string];
class MerkleTreePathStepSibling {
  public constructor(
    public readonly sum: bigint,
    public readonly hash: DataHash,
  ) {}

  public static create(sibling: Branch): MerkleTreePathStepSibling {
    return new MerkleTreePathStepSibling(sibling.sum, sibling.hash);
  }

  public static isJSON(data: unknown): data is MerkleTreePathStepSiblingJson {
    return Array.isArray(data);
  }

  public static fromJSON(data: unknown): MerkleTreePathStepSibling {
    if (!Array.isArray(data) || data.length !== 2) {
      throw new Error('Parsing merkle tree path step branch failed.');
    }

    return new MerkleTreePathStepSibling(BigInt(data[0]), DataHash.fromJSON(data[1]));
  }

  public static fromCBOR(bytes: Uint8Array): MerkleTreePathStepSibling {
    const data = CborDecoder.readArray(bytes);

    return new MerkleTreePathStepSibling(CborDecoder.readUnsignedInteger(data[0]), DataHash.fromCBOR(data[1]));
  }

  public toCBOR(): Uint8Array {
    return CborEncoder.encodeArray([CborEncoder.encodeUnsignedInteger(this.sum), this.hash.toCBOR()]);
  }

  public toJSON(): MerkleTreePathStepSiblingJson {
    return [this.sum.toString(), this.hash.toJSON()];
  }

  public toString(): string {
    return `MerkleTreePathStepSibling[${this.sum},${this.hash.toString()}]`;
  }
}

type MerkleTreePathStepBranchJson = [string, string | null];
class MerkleTreePathStepBranch {
  public constructor(
    public readonly sum: bigint,
    private readonly _value: Uint8Array | null,
  ) {
    this._value = _value ? new Uint8Array(_value) : null;
  }

  public get value(): Uint8Array | null {
    return this._value ? new Uint8Array(this._value) : null;
  }

  public static isJSON(data: unknown): data is MerkleTreePathStepBranchJson {
    return Array.isArray(data);
  }

  public static fromJSON(data: unknown): MerkleTreePathStepBranch {
    if (!Array.isArray(data)) {
      throw new Error('Parsing merkle tree path step branch failed.');
    }

    const sum = data.at(0);
    const value = data.at(1);
    return new MerkleTreePathStepBranch(sum ?? 0n, value ? HexConverter.decode(value) : null);
  }

  public static fromCBOR(bytes: Uint8Array): MerkleTreePathStepBranch {
    const data = CborDecoder.readArray(bytes);

    return new MerkleTreePathStepBranch(
      CborDecoder.readUnsignedInteger(data[0]),
      CborDecoder.readOptional(data[1], CborDecoder.readByteString),
    );
  }

  public toCBOR(): Uint8Array {
    return CborEncoder.encodeArray([CborEncoder.encodeOptional(this._value, CborEncoder.encodeByteString)]);
  }

  public toJSON(): MerkleTreePathStepBranchJson {
    return [this.sum.toString(), this._value ? HexConverter.encode(this._value) : null];
  }

  public toString(): string {
    return `MerkleTreePathStepBranch[${this._value ? HexConverter.encode(this._value) : 'null'}]`;
  }
}

export interface IMerkleTreePathStepJson {
  readonly path: string;
  readonly sibling: MerkleTreePathStepSiblingJson | null;
  readonly branch: MerkleTreePathStepBranchJson | null;
}

export class MerkleTreePathStep {
  private constructor(
    public readonly path: bigint,
    public readonly sibling: MerkleTreePathStepSibling | null,
    public readonly branch: MerkleTreePathStepBranch | null,
  ) {}

  public static createWithoutBranch(path: bigint, sibling: Branch | null): MerkleTreePathStep {
    return new MerkleTreePathStep(path, sibling ? MerkleTreePathStepSibling.create(sibling) : null, null);
  }

  public static create(path: bigint, value: Branch | null, sibling: Branch | null): MerkleTreePathStep {
    if (value == null) {
      return new MerkleTreePathStep(
        path,
        sibling ? MerkleTreePathStepSibling.create(sibling) : null,
        new MerkleTreePathStepBranch(0n, null),
      );
    }

    if (value instanceof LeafBranch) {
      return new MerkleTreePathStep(
        path,
        sibling ? MerkleTreePathStepSibling.create(sibling) : null,
        new MerkleTreePathStepBranch(value.sum, value.value),
      );
    }

    return new MerkleTreePathStep(
      path,
      sibling ? MerkleTreePathStepSibling.create(sibling) : null,
      new MerkleTreePathStepBranch(value.sum, value.childrenHash.data),
    );
  }

  public static isJSON(data: unknown): data is IMerkleTreePathStepJson {
    return (
      typeof data === 'object' &&
      data !== null &&
      'path' in data &&
      typeof data.path === 'string' &&
      'sibling' in data &&
      'branch' in data
    );
  }

  public static fromJSON(data: unknown): MerkleTreePathStep {
    if (!MerkleTreePathStep.isJSON(data)) {
      throw new Error('Parsing merkle tree path step failed.');
    }

    return new MerkleTreePathStep(
      BigInt(data.path),
      data.sibling != null ? MerkleTreePathStepSibling.fromJSON(data.sibling) : null,
      data.branch != null ? MerkleTreePathStepBranch.fromJSON(data.branch) : null,
    );
  }

  public static fromCBOR(bytes: Uint8Array): MerkleTreePathStep {
    const data = CborDecoder.readArray(bytes);

    return new MerkleTreePathStep(
      BigintConverter.decode(CborDecoder.readByteString(data[0])),
      CborDecoder.readOptional(data[1], MerkleTreePathStepSibling.fromCBOR),
      CborDecoder.readOptional(data[2], MerkleTreePathStepBranch.fromCBOR),
    );
  }

  public toCBOR(): Uint8Array {
    return CborEncoder.encodeArray([
      CborEncoder.encodeByteString(BigintConverter.encode(this.path)),
      this.sibling?.toCBOR() ?? CborEncoder.encodeNull(),
      this.branch?.toCBOR() ?? CborEncoder.encodeNull(),
    ]);
  }

  public toJSON(): IMerkleTreePathStepJson {
    return {
      branch: this.branch?.toJSON() ?? null,
      path: this.path.toString(),
      sibling: this.sibling?.toJSON() ?? null,
    };
  }

  public toString(): string {
    return dedent`
      Merkle Tree Path Step
        Path: ${this.path.toString(2)}
        Branch: ${this.branch?.toString() ?? 'null'}
        Sibling: ${this.sibling?.toString() ?? 'null'}`;
  }
}
