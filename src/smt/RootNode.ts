import { Branch } from './Branch.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { dedent } from '../util/StringUtils.js';

export class RootNode {
  public readonly hashPromise: Promise<DataHash>;
  public readonly path: bigint = 1n;

  public constructor(
    algorithm: HashAlgorithm,
    public readonly left: Branch | null,
    public readonly right: Branch | null,
  ) {
    this.hashPromise = Promise.all([left?.hashPromise, right?.hashPromise]).then(([leftHash, rightHash]) => {
      return new DataHasher(algorithm)
        .update(leftHash?.data ?? new Uint8Array(1))
        .update(rightHash?.data ?? new Uint8Array(1))
        .digest();
    });
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
