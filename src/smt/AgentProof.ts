import { IMerkleTreePathDto, MerkleTreePath } from './MerkleTreePath.js';
import { Authenticator, IAuthenticatorDto } from '../api/Authenticator.js';
import { DataHasher, HashAlgorithm } from '../hash/DataHasher.js';
import { SigningService } from '../signing/SigningService.js';
import { HexConverter } from '../util/HexConverter.js';

export interface IAgentProofDto {
  merkleTreePath: IMerkleTreePathDto;
  authenticator: IAuthenticatorDto;
  payload: string;
}

export class AgentProof {
  public constructor(
    public readonly merkleTreePath: MerkleTreePath,
    public readonly authenticator: Authenticator,
    public readonly payload: Uint8Array,
  ) {}

  public static fromDto(data: unknown): AgentProof {
    if (!AgentProof.isDto(data)) {
      throw new Error('Invalid serialized agent proof.');
    }

    return new AgentProof(
      MerkleTreePath.fromDto(data.merkleTreePath),
      Authenticator.fromDto(data.authenticator),
      HexConverter.decode(data.payload),
    );
  }

  public static isDto(data: unknown): data is IAgentProofDto {
    return (
      data instanceof Object &&
      'merkleTreePath' in data &&
      'authenticator' in data &&
      'payload' in data &&
      typeof data.payload === 'string'
    );
  }

  public toDto(): IAgentProofDto {
    return {
      authenticator: this.authenticator.toDto(),
      merkleTreePath: this.merkleTreePath.toDto(),
      payload: HexConverter.encode(this.payload),
    };
  }

  public async verify(requestId: bigint): Promise<string> {
    if (
      !(await SigningService.verifyWithPublicKey(
        this.authenticator.publicKey,
        this.payload as Uint8Array,
        this.authenticator.signature,
      ))
    ) {
      return 'NOT_AUTHENTICATED';
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
      return 'NOT_INCLUDED';
    }

    const result = await this.merkleTreePath.verify(requestId);
    if (!result.isPathInvalid) {
      return 'PATH_INVALID';
    }

    if (!result.isPathIncluded) {
      return 'NOT_INCLUDED';
    }

    return 'OK';
  }
}
