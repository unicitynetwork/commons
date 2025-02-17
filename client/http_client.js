const { hash } = require('../hasher/sha256hasher.js').SHA256Hasher;
const fetch = require("node-fetch"); // Use fetch instead of Axios

class JSONRPCTransport {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  generateRequestId(requestId, method) {
    const timestamp = Math.floor(Date.now() / 1000); // POSIX timestamp in seconds
    const data = `${requestId}-${method}-${timestamp}`;
    return hash(Buffer.from(data).toString('hex'));
  }

  async send(method, params) {
    const payload = {
      jsonrpc: "2.0",
      method,
      params,
      id: this.generateRequestId(params.requestId, method),
    };

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      return { requestId: params.requestId, result: data.result };
    } catch (error) {
      console.error("JSON-RPC Request Error:", error);
      throw error;
    }
  }
}

module.exports = { JSONRPCTransport };
