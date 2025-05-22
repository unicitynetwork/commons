import { Authenticator, IAuthenticatorJson } from './Authenticator.js';
import { Transaction } from './Transaction.js';
import { CborDecoder } from '../cbor/CborDecoder.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { DataHash } from '../hash/DataHash.js';
import { IMerkleTreePathJson, MerkleTreePath } from '../smt/MerkleTreePath.js';
import { dedent } from '../util/StringUtils.js';

export interface IInclusionProofJson {
  readonly merkleTreePath: IMerkleTreePathJson;
  readonly authenticator: IAuthenticatorJson | null;
  readonly transactionHash: string | null;
}

export enum InclusionProofVerificationStatus {
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  PATH_NOT_INCLUDED = 'PATH_NOT_INCLUDED',
  PATH_INVALID = 'PATH_INVALID',
  OK = 'OK',
}

export class InclusionProof {
  public constructor(
    public readonly merkleTreePath: MerkleTreePath,
    public readonly authenticator: Authenticator | null,
    public readonly transactionHash: DataHash | null,
  ) {
    if (!this.authenticator != !this.transactionHash) {
      throw new Error('Authenticator and transaction hash must be both set or both null.');
    }
  }

  public static isJSON(data: unknown): data is IInclusionProofJson {
    return typeof data === 'object' && data !== null && 'merkleTreePath' in data;
  }

  public static fromJSON(data: unknown): InclusionProof {
    if (!InclusionProof.isJSON(data)) {
      throw new Error('Parsing inclusion proof json failed.');
    }

    return new InclusionProof(
      MerkleTreePath.fromJSON(data.merkleTreePath),
      data.authenticator ? Authenticator.fromJSON(data.authenticator) : null,
      data.transactionHash ? DataHash.fromJSON(data.transactionHash) : null,
    );
  }

  public static fromCBOR(bytes: Uint8Array): InclusionProof {
    const data = CborDecoder.readArray(bytes);
    const authenticator = CborDecoder.readOptional(data[1], Authenticator.fromCBOR);
    const transactionHash = CborDecoder.readOptional(data[2], DataHash.fromCBOR);

    return new InclusionProof(MerkleTreePath.fromCBOR(data[0]), authenticator, transactionHash);
  }

  public toJSON(): IInclusionProofJson {
    return {
      authenticator: this.authenticator?.toJSON() ?? null,
      merkleTreePath: this.merkleTreePath.toJSON(),
      transactionHash: this.transactionHash?.toJSON() ?? null,
    };
  }

  public toCBOR(): Uint8Array {
    return CborEncoder.encodeArray([
      this.merkleTreePath.toCBOR(),
      this.authenticator?.toCBOR() ?? CborEncoder.encodeNull(),
      this.transactionHash?.toCBOR() ?? CborEncoder.encodeNull(),
    ]);
  }

  public async verify(requestId: bigint): Promise<InclusionProofVerificationStatus> {
    if (this.authenticator && this.transactionHash) {
      if (!(await this.authenticator.verify(this.transactionHash))) {
        return InclusionProofVerificationStatus.NOT_AUTHENTICATED;
      }

      const transaction = await Transaction.create(this.authenticator, this.transactionHash);
      if (!transaction.verify(this.merkleTreePath.steps.at(0)?.value)) {
        return InclusionProofVerificationStatus.PATH_NOT_INCLUDED;
      }
    }

    const result = await this.merkleTreePath.verify(requestId);
    if (!result.isPathValid) {
      return InclusionProofVerificationStatus.PATH_INVALID;
    }

    if (!result.isPathIncluded) {
      return InclusionProofVerificationStatus.PATH_NOT_INCLUDED;
    }

    return InclusionProofVerificationStatus.OK;
  }

  public toString(): string {
    return dedent`
      Inclusion Proof
        ${this.merkleTreePath.toString()}
        ${this.authenticator?.toString()}
        Transaction Hash: ${this.transactionHash?.toString() ?? null}`;
  }
}
