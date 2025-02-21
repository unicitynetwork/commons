import { Branch } from './Branch.js';
import { DataHasher, IHashAlgorithm } from '../hash/DataHasher.js';
import { dedent } from '../util/StringUtils.js';

export class RootNode {
  public readonly path: bigint = 1n;

  public constructor(
    public readonly left: Branch | null,
    public readonly right: Branch | null,
    private readonly _hash: Uint8Array,
  ) {}

  public get hash(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  public static async create(algorithm: IHashAlgorithm, left: Branch | null, right: Branch | null): Promise<RootNode> {
    const hash = await new DataHasher(algorithm)
      .update(left?.hash ?? new Uint8Array(1))
      .update(right?.hash ?? new Uint8Array(1))
      .digest();

    return new RootNode(left, right, hash);
  }

  public toString(): string {
    return dedent`
      RootNode
        Left: 
          ${this.left?.toString()}
        Right: 
          ${this.right?.toString()}`;
  }
}
