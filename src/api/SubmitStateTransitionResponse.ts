import { StateTransitionStatus } from './StateTransitionStatus.js';

export class SubmitStateTransitionResponse {
  public constructor(
    public readonly status: StateTransitionStatus,
    public readonly requestId: bigint,
  ) {}

  public static fromDto(data: unknown): SubmitStateTransitionResponse {
    if (!SubmitStateTransitionResponse.isDto(data)) {
      throw new Error('Parsing submit state transition response failed.');
    }

    return new SubmitStateTransitionResponse(data.status, BigInt(data.requestId));
  }

  public static isDto(data: unknown): data is SubmitStateTransitionResponse {
    return (
      data instanceof Object &&
      'status' in data &&
      'requestId' in data &&
      typeof data.status === 'string' &&
      StateTransitionStatus[data.status as StateTransitionStatus] &&
      typeof data.requestId === 'string'
    );
  }
}
