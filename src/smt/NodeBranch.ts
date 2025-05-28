import { Branch } from './Branch.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { dedent } from '../util/StringUtils.js';

export class NodeBranch {
  private readonly childrenHash: Promise<DataHash>;
  private readonly hash: Promise<DataHash>;

  public constructor(
    public readonly algorithm: HashAlgorithm,
    public readonly path: bigint,
    public readonly left: Branch,
    public readonly right: Branch,
  ) {
    this.childrenHash = Promise.all([left.calculateHash(), right.calculateHash()]).then(([leftHash, rightHash]) => {
      return new DataHasher(algorithm)
        .update(leftHash.data ?? new Uint8Array(1))
        .update(rightHash.data ?? new Uint8Array(1))
        .digest();
    });
    this.hash = this.childrenHash.then((hash) =>
      new DataHasher(algorithm).update(BigintConverter.encode(path)).update(hash.data).digest(),
    );
  }

  public calculateChildrenHash(): Promise<DataHash> {
    return this.childrenHash;
  }

  public calculateHash(): Promise<DataHash> {
    return this.hash;
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
