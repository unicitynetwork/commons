import { Authenticator } from './Authenticator.js';
import { DataHash } from '../hash/DataHash.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';

const textEncoder = new TextEncoder();

export class Transaction {
  private constructor(
    public readonly authenticator: Authenticator,
    public readonly transactionHash: DataHash,
    public readonly leafValue: DataHash,
  ) {}

  public static async create(authenticator: Authenticator, transactionHash: DataHash): Promise<Transaction> {
    const hash = await new DataHasher(HashAlgorithm.SHA256)
      .update(textEncoder.encode(JSON.stringify(authenticator.toDto())))
      .update(transactionHash.imprint)
      .digest();

    return new Transaction(authenticator, transactionHash, hash);
  }
}
