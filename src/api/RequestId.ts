import { DataHasher, HashAlgorithm } from "../hash/DataHasher";
import { HexConverter } from "../util/HexConverter";

export class RequestId {
  private constructor(private readonly _hash: Uint8Array) {
    this._hash = new Uint8Array(_hash);
  }

  public get hash(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  public get hashAlgorithm(): string {
    return HashAlgorithm.SHA256.name;
  }

  public static async create(id: Uint8Array, stateHash: Uint8Array): Promise<RequestId> {
    return new RequestId(await new DataHasher(HashAlgorithm.SHA256).update(id).update(stateHash).digest());
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
