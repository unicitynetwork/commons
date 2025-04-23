import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { NodeBranch } from './NodeBranch.js';
import { DataHash } from '../hash/DataHash.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export interface IMerkleTreePathStepDto {
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

  public static createFromLeaf(branch: LeafBranch, sibling: Branch | null): MerkleTreePathStep {
    return new MerkleTreePathStep(branch.path, sibling?.hash ?? null, branch.value);
  }

  public static createFromBranch(branch: NodeBranch, sibling: Branch | null): MerkleTreePathStep {
    return new MerkleTreePathStep(branch.path, sibling?.hash ?? null, null);
  }

  public static fromDto(data: unknown): MerkleTreePathStep {
    if (!MerkleTreePathStep.isDto(data)) {
      throw new Error('Parsing merkle tree path step failed.');
    }

    return new MerkleTreePathStep(
      BigInt(data.path),
      data.sibling == null ? null : DataHash.fromDto(data.sibling),
      data.value == null ? null : HexConverter.decode(data.value),
    );
  }

  public static isDto(data: unknown): data is IMerkleTreePathStepDto {
    return data instanceof Object && 'path' in data && typeof data.path === 'string';
  }

  public toDto(): IMerkleTreePathStepDto {
    return {
      path: this.path.toString(),
      sibling: this.sibling?.toDto(),
      value: this.value ? HexConverter.encode(this.value) : undefined,
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
