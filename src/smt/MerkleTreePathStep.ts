import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { CborDecoder } from '../cbor/CborDecoder.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { DataHash } from '../hash/DataHash.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export interface IMerkleTreePathStepJson {
  readonly path: string;
  readonly sibling: string | null;
  readonly value?: string | null;
}

export class MerkleTreePathStep {
  private constructor(
    public readonly path: bigint,
    public readonly sibling: DataHash | null,
    public readonly _value?: Uint8Array | null,
  ) {
    this._value = _value ? new Uint8Array(_value) : _value;
  }

  public get value(): Uint8Array | null | undefined {
    return this._value ? new Uint8Array(this._value) : this._value;
  }

  public static async create(path: bigint, branch: Branch | null, sibling: Branch | null): Promise<MerkleTreePathStep> {
    return new MerkleTreePathStep(
      path,
      (await sibling?.hashPromise) ?? null,
      branch ? (branch instanceof LeafBranch ? branch.value : undefined) : null,
    );
  }

  public static isJSON(data: unknown): data is IMerkleTreePathStepJson {
    return (
      typeof data === 'object' && data !== null && 'path' in data && typeof data.path === 'string' && 'sibling' in data
    );
  }

  public static fromJSON(data: unknown): MerkleTreePathStep {
    if (!MerkleTreePathStep.isJSON(data)) {
      throw new Error('Parsing merkle tree path step failed.');
    }

    return new MerkleTreePathStep(
      BigInt(data.path),
      data.sibling == null ? null : DataHash.fromJSON(data.sibling),
      data.value != null ? HexConverter.decode(data.value) : data.value,
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
      this.sibling?.toCBOR() ?? CborEncoder.encodeNull(),
      CborEncoder.encodeOptional(this._value, CborEncoder.encodeByteString),
    ]);
  }

  public toJSON(): IMerkleTreePathStepJson {
    return {
      path: this.path.toString(),
      sibling: this.sibling?.toJSON() ?? null,
      value: this._value ? HexConverter.encode(this._value) : this._value,
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
