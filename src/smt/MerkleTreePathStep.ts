import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { NodeBranch } from './NodeBranch.js';
import { CborDecoder } from '../cbor/CborDecoder.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { DataHash } from '../hash/DataHash.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';
import { BigintConverter } from "../util/BigintConverter";

export interface IMerkleTreePathStepJson {
  readonly path: string;
  readonly value?: string;
  readonly sibling?: string;
}

export class MerkleTreePathStep {
  private constructor(
    public readonly path: bigint,
    public readonly sibling: DataHash | null,
    private readonly _value: Uint8Array | null,
  ) {
    this._value = _value ? new Uint8Array(_value) : null;
  }

  public get value(): Uint8Array | null {
    return this._value ? new Uint8Array(this._value) : null;
  }

  public static async createFromLeaf(branch: LeafBranch, sibling: Branch | null): Promise<MerkleTreePathStep> {
    return new MerkleTreePathStep(branch.path, (await sibling?.hashPromise) ?? null, branch.value);
  }

  public static async createFromBranch(branch: NodeBranch, sibling: Branch | null): Promise<MerkleTreePathStep> {
    return new MerkleTreePathStep(branch.path, (await sibling?.hashPromise) ?? null, null);
  }

  public static isJSON(data: unknown): data is IMerkleTreePathStepJson {
    return typeof data === 'object' && data !== null && 'path' in data && typeof data.path === 'string';
  }

  public static fromJSON(data: unknown): MerkleTreePathStep {
    if (!MerkleTreePathStep.isJSON(data)) {
      throw new Error('Parsing merkle tree path step failed.');
    }

    return new MerkleTreePathStep(
      BigInt(data.path),
      data.sibling == null ? null : DataHash.fromJSON(data.sibling),
      data.value == null ? null : HexConverter.decode(data.value),
    );
  }

  public static fromCBOR(bytes: Uint8Array): MerkleTreePathStep {
    const data = CborDecoder.readArray(bytes);

    const siblingBytes = CborDecoder.readOptional(data[1], CborDecoder.readByteString);
    return new MerkleTreePathStep(
      BigintConverter.decode(CborDecoder.readByteString(data[0])),
      siblingBytes ? DataHash.fromImprint(siblingBytes) : null,
      CborDecoder.readOptional(data[2], CborDecoder.readByteString),
    );
  }

  public toCBOR(): Uint8Array {
    return CborEncoder.encodeArray([
      CborEncoder.encodeByteString(BigintConverter.encode(this.path)),
      this.sibling ? CborEncoder.encodeByteString(this.sibling.imprint) : CborEncoder.encodeNull(),
      this._value ? CborEncoder.encodeByteString(this._value) : CborEncoder.encodeNull(),
    ]);
  }

  public toJSON(): IMerkleTreePathStepJson {
    return {
      path: this.path.toString(),
      sibling: this.sibling?.toJSON(),
      value: this._value ? HexConverter.encode(this._value) : undefined,
    };
  }

  public toString(): string {
    return dedent`
      Merkle Tree Path Step
        Path: ${this.path.toString(2)}
        Value: ${this._value ? HexConverter.encode(this._value) : 'null'}
        Sibling: ${this.sibling?.toString() ?? 'null'}`;
  }
}
