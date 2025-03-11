import { Authenticator, IAuthenticatorDto } from './Authenticator.js';
import { DataHasher, HashAlgorithm } from '../hash/DataHasher.js';
import { SigningService } from '../signing/SigningService.js';
import { IMerkleTreePathDto, MerkleTreePath } from '../smt/MerkleTreePath.js';
import { HexConverter } from '../util/HexConverter.js';

export interface IInclusionProofDto {
  merkleTreePath: IMerkleTreePathDto;
  authenticator: IAuthenticatorDto;
  payload: string;
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
    private readonly _payload: Uint8Array,
  ) {
    this._payload = new Uint8Array(_payload);
  }

  public get payload(): Uint8Array {
    return new Uint8Array(this._payload);
  }

  public static fromDto(data: unknown): InclusionProof {
    if (!InclusionProof.isDto(data)) {
      throw new Error('Parsing inclusion proof dto failed.');
    }

    return new InclusionProof(
      MerkleTreePath.fromDto(data.merkleTreePath),
      Authenticator.fromDto(data.authenticator),
      HexConverter.decode(data.payload),
    );
  }

  public static isDto(data: unknown): data is IInclusionProofDto {
    return (
      data instanceof Object &&
      'merkleTreePath' in data &&
      'authenticator' in data &&
      'payload' in data &&
      typeof data.payload === 'string'
    );
  }

  public toDto(): IInclusionProofDto {
    return {
      authenticator: this.authenticator.toDto(),
      merkleTreePath: this.merkleTreePath.toDto(),
      payload: HexConverter.encode(this.payload),
    };
  }

  public async verify(requestId: bigint): Promise<InclusionProofVerificationStatus> {
    if (
      !(await SigningService.verifyWithPublicKey(
        this.authenticator.publicKey,
        this.payload as Uint8Array,
        this.authenticator.signature,
      ))
    ) {
      return InclusionProofVerificationStatus.NOT_AUTHENTICATED;
    }

    const hash = await new DataHasher(HashAlgorithm.SHA256)
      .update(
        new TextEncoder().encode(
          JSON.stringify({
            authenticator: this.authenticator,
            payload: this.payload,
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
    if (!result.isPathInvalid) {
      return InclusionProofVerificationStatus.PATH_INVALID;
    }

    if (!result.isPathIncluded) {
      return InclusionProofVerificationStatus.NOT_INCLUDED;
    }

    return InclusionProofVerificationStatus.OK;
  }
}
