import { Authenticator, IAuthenticatorDto } from './Authenticator.js';
import { DataHasher } from '../hash/DataHasher.js';
import { HashAlgorithm } from '../hash/HashAlgorithm.js';
import { IMerkleTreePathDto, MerkleTreePath } from '../smt/MerkleTreePath.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export interface IInclusionProofDto {
  merkleTreePath: IMerkleTreePathDto;
  authenticator: IAuthenticatorDto;
  transactionHash: string;
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
    private readonly _transactionHash: Uint8Array,
  ) {
    this._transactionHash = new Uint8Array(_transactionHash);
  }

  public get transactionHash(): Uint8Array {
    return new Uint8Array(this._transactionHash);
  }

  public static fromDto(data: unknown): InclusionProof {
    if (!InclusionProof.isDto(data)) {
      throw new Error('Parsing inclusion proof dto failed.');
    }

    return new InclusionProof(
      MerkleTreePath.fromDto(data.merkleTreePath),
      Authenticator.fromDto(data.authenticator),
      HexConverter.decode(data.transactionHash),
    );
  }

  public static isDto(data: unknown): data is IInclusionProofDto {
    return (
      data instanceof Object &&
      'merkleTreePath' in data &&
      'authenticator' in data &&
      'transactionHash' in data &&
      typeof data.transactionHash === 'string'
    );
  }

  public toDto(): IInclusionProofDto {
    return {
      authenticator: this.authenticator.toDto(),
      merkleTreePath: this.merkleTreePath.toDto(),
      transactionHash: HexConverter.encode(this.transactionHash),
    };
  }

  public async verify(requestId: bigint): Promise<InclusionProofVerificationStatus> {
    if (!(await this.authenticator.verify(this.transactionHash))) {
      return InclusionProofVerificationStatus.NOT_AUTHENTICATED;
    }

    const hash = await new DataHasher(HashAlgorithm.SHA256)
      .update(
        new TextEncoder().encode(
          JSON.stringify({
            authenticator: this.authenticator,
            transactionHash: this.transactionHash,
          }),
        ),
      )
      .digest();

    if (
      HexConverter.encode(hash) !== HexConverter.encode(this.merkleTreePath.steps.at(-1)?.value ?? new Uint8Array())
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
        Payload: ${HexConverter.encode(this._transactionHash)}`;
  }
}
