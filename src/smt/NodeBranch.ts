import { Branch } from './Branch.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { dedent } from '../util/StringUtils.js';

export class NodeBranch {
  public constructor(
    public readonly path: bigint,
    public readonly left: Branch,
    public readonly right: Branch,
    public readonly hash: DataHash,
  ) {}

  public static async create(algorithm: HashAlgorithm, path: bigint, left: Branch, right: Branch): Promise<NodeBranch> {
    const childHash = await new DataHasher(algorithm)
      .update(left?.hash.data ?? new Uint8Array(1))
      .update(right?.hash.data ?? new Uint8Array(1))
      .digest();

    const hash = await new DataHasher(algorithm).update(BigintConverter.encode(path)).update(childHash.data).digest();

    return new NodeBranch(path, left, right, hash);
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
