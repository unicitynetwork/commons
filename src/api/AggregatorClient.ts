import { JsonRpcHttpTransport } from '../client/JsonRpcHttpTransport';

export class AggregatorClient {
  public constructor(private readonly transport: JsonRpcHttpTransport) {}

  async submitStateTransition(requestId, payload, authenticator) {
    const data = {
      requestId,
      payload,
      authenticator,
    };
    return await this.transport.request('aggregator_submit', data);
  }

  async getInclusionProof(requestId, blockNum) {
    const data = { requestId, blockNum };
    return await this.transport.request('aggregator_get_path', data);
  }

  async getNodelProof(blockNum) {
    const data = { requestId };
    return await this.transport.request('aggregator_get_nodel', data);
  }
}
