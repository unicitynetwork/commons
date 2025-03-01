import { Authenticator } from './Authenticator.js';
import { SubmitStateTransitionResponse } from './SubmitStateTransitionResponse.js';
import { JsonRpcHttpTransport } from '../client/JsonRpcHttpTransport.js';
import { AgentProof } from '../smt/AgentProof.js';
import { HexConverter } from '../util/HexConverter.js';

export class AggregatorClient {
  private readonly transport: JsonRpcHttpTransport;
  public constructor(url: string) {
    this.transport = new JsonRpcHttpTransport(url);
  }

  public async submitStateTransition(
    requestId: Uint8Array,
    payload: Uint8Array,
    authenticator: Authenticator,
  ): Promise<SubmitStateTransitionResponse> {
    const data = {
      authenticator: authenticator.toDto(),
      payload: HexConverter.encode(payload),
      requestId: HexConverter.encode(requestId),
    };

    return SubmitStateTransitionResponse.fromDto(await this.transport.request('aggregator_submit', data));
  }

  public async getInclusionProof(requestId: bigint, blockNum: bigint): Promise<AgentProof> {
    const data = { blockNum: blockNum.toString(), requestId: requestId.toString() };
    return AgentProof.fromDto(await this.transport.request('aggregator_get_path', data));
  }

  public getNodelProof(requestId: bigint): Promise<unknown> {
    const data = { requestId: requestId.toString() };
    return this.transport.request('aggregator_get_nodel', data);
  }
}
