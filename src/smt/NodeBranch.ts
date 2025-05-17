import { Branch } from './Branch.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { dedent } from '../util/StringUtils.js';

export class NodeBranch {
  public readonly hashPromise: Promise<DataHash>;

  public constructor(
    algorithm: HashAlgorithm,
    public readonly path: bigint,
    public readonly left: Branch,
    public readonly right: Branch,
  ) {
    this.hashPromise = Promise.all([left.hashPromise, right.hashPromise])
      .then(([leftHash, rightHash]) => {
        return new DataHasher(algorithm)
          .update(leftHash.data ?? new Uint8Array(1))
          .update(rightHash.data ?? new Uint8Array(1))
          .digest();
      })
      .then((hash) => new DataHasher(algorithm).update(BigintConverter.encode(path)).update(hash.data).digest());
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
