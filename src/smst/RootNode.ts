import { Branch } from './Branch.js';
import { DataHash } from '../hash/DataHash.js';

export class RootNode {
  public readonly path = 1n;

  public constructor(
    public readonly left: Branch | null,
    public readonly right: Branch | null,
    public readonly sum: bigint,
    public readonly hash: DataHash,
  ) {}
}
