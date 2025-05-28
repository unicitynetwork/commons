import { Authenticator } from './Authenticator.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { HexConverter } from '../util/HexConverter.js';

export class LeafValue {
  private constructor(private readonly _bytes: Uint8Array) {
    this._bytes = new Uint8Array(_bytes);
  }

  public get bytes(): Uint8Array {
    return new Uint8Array(this._bytes);
  }

  public static async create(authenticator: Authenticator, transactionHash: DataHash): Promise<LeafValue> {
    // TODO: Create cbor object to calculate hash so it would be consistent with everything else?
    const hash = await new DataHasher(HashAlgorithm.SHA256)
      .update(authenticator.toCBOR())
      .update(transactionHash.imprint)
      .digest();

    return new LeafValue(hash.imprint);
  }

  public equals(data: unknown): boolean {
    if (ArrayBuffer.isView(data)) {
      return (
        HexConverter.encode(this.bytes) ===
        HexConverter.encode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
      );
    }

    return false;
  }

  public toString(): string {
    return `LeafValue[${HexConverter.encode(this.bytes)}]`;
  }
}
