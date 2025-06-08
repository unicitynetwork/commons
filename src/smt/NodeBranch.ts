import { Branch } from './Branch.js';
import { DataHash } from '../hash/DataHash.js';

export class NodeBranch {
  public constructor(
    public readonly path: bigint,
    public readonly left: Branch,
    public readonly right: Branch,
    public readonly childrenHash: DataHash,
    public readonly hash: DataHash,
  ) {}

  public finalize(): Promise<NodeBranch> {
    return Promise.resolve(this);
  }
}
