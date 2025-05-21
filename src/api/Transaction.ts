import { Authenticator } from './Authenticator.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';

export class Transaction {
  private constructor(
    public readonly authenticator: Authenticator,
    public readonly transactionHash: DataHash,
    public readonly leafValue: DataHash,
  ) {}

  public static async create(authenticator: Authenticator, transactionHash: DataHash): Promise<Transaction> {
    // TODO: Create cbor object to calculate hash so it would be consistent with everything else?
    const hash = await new DataHasher(HashAlgorithm.SHA256)
      .update(authenticator.toCBOR())
      .update(transactionHash.imprint)
      .digest();

    return new Transaction(authenticator, transactionHash, hash);
  }
}
