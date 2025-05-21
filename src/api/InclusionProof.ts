import { Authenticator, IAuthenticatorJson } from './Authenticator.js';
import { Transaction } from './Transaction.js';
import { CborDecoder } from '../cbor/CborDecoder.js';
import { CborEncoder } from '../cbor/CborEncoder.js';
import { DataHash } from '../hash/DataHash.js';
import { IMerkleTreePathJson, MerkleTreePath } from '../smt/MerkleTreePath.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export interface IInclusionProofJson {
  readonly merkleTreePath: IMerkleTreePathJson;
  readonly authenticator: IAuthenticatorJson;
  readonly transactionHash: string;
}

export enum InclusionProofVerificationStatus {
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  NOT_INCLUDED = 'NOT_INCLUDED',
  PATH_INVALID = 'PATH_INVALID',
  OK = 'OK',
}

export class InclusionProof {
  public constructor(
    public readonly merkleTreePath: MerkleTreePath,
    public readonly authenticator: Authenticator,
    public readonly transactionHash: DataHash,
  ) {}

  public static isJSON(data: unknown): data is IInclusionProofJson {
    return (
      typeof data === 'object' &&
      data !== null &&
      'merkleTreePath' in data &&
      'authenticator' in data &&
      'transactionHash' in data &&
      typeof data.transactionHash === 'string'
    );
  }

  public static fromJSON(data: unknown): InclusionProof {
    if (!InclusionProof.isJSON(data)) {
      throw new Error('Parsing inclusion proof dto failed.');
    }

    return new InclusionProof(
      MerkleTreePath.fromJSON(data.merkleTreePath),
      Authenticator.fromJSON(data.authenticator),
      DataHash.fromJSON(data.transactionHash),
    );
  }

  public static fromCBOR(bytes: Uint8Array): InclusionProof {
    const data = CborDecoder.readArray(bytes);

    return new InclusionProof(
      MerkleTreePath.fromCBOR(data[0]),
      Authenticator.fromCBOR(data[1]),
      DataHash.fromCBOR(data[2]),
    );
  }

  public toJSON(): IInclusionProofJson {
    return {
      authenticator: this.authenticator.toJSON(),
      merkleTreePath: this.merkleTreePath.toJSON(),
      transactionHash: this.transactionHash.toJSON(),
    };
  }

  public toCBOR(): Uint8Array {
    return CborEncoder.encodeArray([
      this.merkleTreePath.toCBOR(),
      this.authenticator.toCBOR(),
      CborEncoder.encodeByteString(this.transactionHash.imprint),
    ]);
  }

  public async verify(requestId: bigint): Promise<InclusionProofVerificationStatus> {
    if (!(await this.authenticator.verify(this.transactionHash))) {
      return InclusionProofVerificationStatus.NOT_AUTHENTICATED;
    }

    const transaction = await Transaction.create(this.authenticator, this.transactionHash);

    if (
      HexConverter.encode(transaction.leafValue.imprint) !==
      HexConverter.encode(this.merkleTreePath.steps.at(0)?.value ?? new Uint8Array())
    ) {
      return InclusionProofVerificationStatus.NOT_INCLUDED;
    }

    const result = await this.merkleTreePath.verify(requestId);
    if (!result.isPathValid) {
      return InclusionProofVerificationStatus.PATH_INVALID;
    }

    if (!result.isPathIncluded) {
      return InclusionProofVerificationStatus.NOT_INCLUDED;
    }

    return InclusionProofVerificationStatus.OK;
  }

  public toString(): string {
    return dedent`
      Inclusion Proof
        ${this.merkleTreePath.toString()}
        ${this.authenticator.toString()}
        Transaction Hash: ${this.transactionHash.toString()}`;
  }
}
