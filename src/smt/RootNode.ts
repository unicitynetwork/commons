import { Branch } from './Branch.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { dedent } from '../util/StringUtils.js';

export class RootNode {
  public readonly path: bigint = 1n;

  public constructor(
    public readonly left: Branch | null,
    public readonly right: Branch | null,
    public readonly hash: DataHash,
  ) {}

  public static async create(algorithm: HashAlgorithm, left: Branch | null, right: Branch | null): Promise<RootNode> {
    const hash = await new DataHasher(algorithm)
      .update(left?.hash.data ?? new Uint8Array(1))
      .update(right?.hash.data ?? new Uint8Array(1))
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
