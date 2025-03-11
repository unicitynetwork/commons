import { Branch } from './Branch.js';
import { LeafBranch } from './LeafBranch.js';
import { NodeBranch } from './NodeBranch.js';
import { HexConverter } from '../util/HexConverter.js';

export interface IMerkleTreePathStepDto {
  readonly path: string;
  readonly value?: string;
  readonly sibling?: string;
}

export class MerkleTreePathStep {
  public constructor(
    public readonly path: bigint,
    private readonly _value: Uint8Array | null,
    private readonly _sibling: Uint8Array | null,
  ) {
    this._value = _value ? new Uint8Array(_value) : null;
    this._sibling = _sibling ? new Uint8Array(_sibling) : null;
  }

  public get value(): Uint8Array | null {
    return this._value;
  }

  public get sibling(): Uint8Array | null {
    return this._sibling;
  }

  public static createFromLeaf(branch: LeafBranch, sibling: Branch | null): MerkleTreePathStep {
    return new MerkleTreePathStep(branch.path, branch.value, sibling?.hash ?? null);
  }

  public static createFromBranch(branch: NodeBranch, sibling: Branch | null): MerkleTreePathStep {
    return new MerkleTreePathStep(branch.path, null, sibling?.hash ?? null);
  }

  public static fromDto(data: unknown): MerkleTreePathStep {
    if (!MerkleTreePathStep.isDto(data)) {
      throw new Error('Parsing merkle tree path step failed.');
    }

    return new MerkleTreePathStep(
      BigInt(data.path),
      data.value == null ? null : HexConverter.decode(data.value),
      data.sibling == null ? null : HexConverter.decode(data.sibling),
    );
  }

  public static isDto(data: unknown): data is IMerkleTreePathStepDto {
    return (
      data instanceof Object &&
      'path' in data &&
      typeof data.path === 'string' &&
      'value' in data &&
      (data.value == null ? true : typeof data.value === 'string') &&
      'sibling' in data &&
      (data.sibling == null ? true : typeof data.sibling === 'string')
    );
  }

  public toDto(): IMerkleTreePathStepDto {
    return {
      path: this.path.toString(),
      sibling: this.sibling ? HexConverter.encode(this.sibling) : undefined,
      value: this.value ? HexConverter.encode(this.value) : undefined,
    };
  }
}
