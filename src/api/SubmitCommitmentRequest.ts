import { Authenticator, IAuthenticatorJson } from './Authenticator';
import { RequestId } from './RequestId';
import { DataHash } from '../hash/DataHash';

/**
 * JSON representation of a submit commitment request.
 */
export interface ISubmitCommitmentRequestJson {
  requestId: string;
  transactionHash: string;
  authenticator: IAuthenticatorJson;
  receipt?: boolean;
}

/**
 * Request object sent by the client to the aggregator.
 */
export class SubmitCommitmentRequest {
  public constructor(
    public readonly requestId: RequestId,
    public readonly transactionHash: DataHash,
    public readonly authenticator: Authenticator,
    public readonly receipt?: boolean,
  ) {}

  /**
   * Convert the request to a JSON object.
   *
   * @returns JSON object
   */
  public toJSON(): ISubmitCommitmentRequestJson {
    return {
      requestId: this.requestId.toJSON(),
      transactionHash: this.transactionHash.toJSON(),
      authenticator: this.authenticator.toJSON(),
      receipt: this.receipt,
    };
  }

  /**
   * Parse a JSON object into a SubmitCommitmentRequest object.
   *
   * @param data Raw request
   * @returns SubmitCommitmentRequest object
   */
  public static fromJSON(data: unknown): SubmitCommitmentRequest {
    if (!SubmitCommitmentRequest.isJSON(data)) {
      throw new Error('Parsing submit state transition request failed.');
    }

    return new SubmitCommitmentRequest(
      RequestId.fromJSON(data.requestId),
      DataHash.fromJSON(data.transactionHash),
      Authenticator.fromJSON(data.authenticator),
      data.receipt,
    );
  }

  /**
   * Check if the given data is a valid JSON request object.
   *
   * @param data Raw request
   * @returns True if the data is a valid JSON request object
   */
  public static isJSON(data: unknown): data is ISubmitCommitmentRequestJson {
    return (
      typeof data === 'object' &&
      data !== null &&
      'authenticator' in data &&
      typeof data.authenticator === 'object' &&
      data.authenticator !== null &&
      'requestId' in data &&
      typeof data.requestId === 'string' &&
      'transactionHash' in data &&
      typeof data.transactionHash === 'string'
    );
  }
}
