import { hexToBytes } from '@noble/hashes/utils';

import { Branch } from './Branch.js';
import { DataHasher, IHashAlgorithm } from '../hash/DataHasher.js';
import { dedent } from '../util/StringUtils.js';

export class NodeBranch {
  public constructor(
    public readonly path: bigint,
    public readonly left: Branch | null,
    public readonly right: Branch | null,
    private readonly _hash: Uint8Array,
  ) {}

  public get hash(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  public static async create(
    algorithm: IHashAlgorithm,
    path: bigint,
    left: Branch | null,
    right: Branch | null,
  ): Promise<NodeBranch> {
    const hash = await new DataHasher(algorithm)
      .update(left?.hash ?? new Uint8Array(1))
      .update(right?.hash ?? new Uint8Array(1))
      .digest();
    const pathBase16 = path.toString(16);
    const pathHex = (pathBase16.length % 2 !== 0 ? '0' : '') + pathBase16;

    return new NodeBranch(
      path,
      left,
      right,
      await new DataHasher(algorithm).update(hexToBytes(pathHex)).update(hash).digest(),
    );
  }

  public toString(): string {
    return dedent`
      Branch[${this.path.toString(2)}]
        Left: 
          ${this.left?.toString()}
        Right: 
          ${this.right?.toString()}`;
  }
}
