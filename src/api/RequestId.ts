import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { HexConverter } from "../util/HexConverter";
import { CborEncoder } from "../cbor/CborEncoder";
import { CborDecoder } from "../cbor/CborDecoder";

export class RequestId {
  private constructor(public readonly hash: DataHash) {}

  public static create(id: Uint8Array, stateHash: DataHash): Promise<RequestId> {
    return RequestId.createFromImprint(id, stateHash.imprint);
  }

  public static async createFromImprint(id: Uint8Array, hashImprint: Uint8Array): Promise<RequestId> {
    const hash = await new DataHasher(HashAlgorithm.SHA256).update(id).update(hashImprint).digest();
    return new RequestId(hash);
  }

  public static fromCBOR(data: Uint8Array): RequestId {
    return new RequestId(DataHash.fromCBOR(data));
  }

  public static fromJSON(data: string): RequestId {
    return new RequestId(DataHash.fromJSON(data));
  }

  public toBigInt(): bigint {
    return BigInt(`0x01${HexConverter.encode(this.hash.imprint)}`);
  }

  public toJSON(): string {
    return this.hash.toJSON();
  }

  public toCBOR(): Uint8Array {
    return this.hash.toCBOR();
  }

  public equals(requestId: RequestId): boolean {
    return this.hash.equals(requestId.hash);
  }

  public toString(): string {
    return `RequestId[${this.hash.toString()}]`;
  }
}
