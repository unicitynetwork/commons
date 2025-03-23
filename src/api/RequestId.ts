import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { HexConverter } from '../util/HexConverter.js';

export class RequestId {
  private constructor(private readonly _hash: Uint8Array) {
    this._hash = new Uint8Array(_hash);
  }

  public get hash(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  public static async create(id: Uint8Array, stateHash: Uint8Array): Promise<RequestId> {
    const hash = await new DataHasher(HashAlgorithm.SHA256).update(id).update(stateHash).digest();
    return new RequestId(hash.imprint);
  }

  public static createFromBytes(data: Uint8Array): RequestId {
    return new RequestId(data);
  }

  public encode(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  public toBigInt(): bigint {
    return BigInt(`0x01${this._hash}`);
  }

  public toString(): string {
    return `RequestId[${HexConverter.encode(this._hash)}]`;
  }
}
