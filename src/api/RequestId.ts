import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';

export class RequestId {
  private constructor(public readonly hash: DataHash) {}

  public static create(id: Uint8Array, stateHash: DataHash): Promise<RequestId> {
    return RequestId.createFromImprint(id, stateHash.imprint);
  }

  public static async createFromImprint(id: Uint8Array, hashImprint: Uint8Array): Promise<RequestId> {
    const hash = await new DataHasher(HashAlgorithm.SHA256).update(id).update(hashImprint).digest();
    return new RequestId(hash);
  }

  public static fromDto(data: string): RequestId {
    return new RequestId(DataHash.fromDto(data));
  }

  public toBigInt(): bigint {
    return BigInt(`0x01${this.hash.toDto()}`);
  }

  public toDto(): string {
    return this.hash.toDto();
  }

  public equals(requestId: RequestId): boolean {
    return this.hash.equals(requestId.hash);
  }

  public toString(): string {
    return `RequestId[${this.hash.toString()}]`;
  }
}
