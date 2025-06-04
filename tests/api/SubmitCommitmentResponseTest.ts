import { RequestId } from '../../src/api/RequestId.js';
import { SubmitCommitmentResponse, SubmitCommitmentStatus } from '../../src/api/SubmitCommitmentResponse.js';
import { DataHash } from '../../src/hash/DataHash.js';
import { Signature } from '../../src/signing/Signature.js';
import { SigningService } from '../../src/signing/SigningService.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('SubmitCommitmentResponse', () => {
  it('should encode and decode JSON to exactly same object', async () => {
    // Test simple success response without request
    const response1 = new SubmitCommitmentResponse(SubmitCommitmentStatus.SUCCESS);

    const json1 = response1.toJSON();
    expect(json1).toEqual({
      algorithm: undefined,
      publicKey: undefined,
      request: undefined,
      signature: undefined,
      status: SubmitCommitmentStatus.SUCCESS,
    });

    const decoded1 = await SubmitCommitmentResponse.fromJSON(json1);
    expect(decoded1.status).toBe(SubmitCommitmentStatus.SUCCESS);
    expect(decoded1.request).toBeUndefined();
    expect(decoded1.algorithm).toBeUndefined();
    expect(decoded1.publicKey).toBeUndefined();
    expect(decoded1.signature).toBeUndefined();

    // Test error response
    const response2 = new SubmitCommitmentResponse(SubmitCommitmentStatus.AUTHENTICATOR_VERIFICATION_FAILED);

    const json2 = response2.toJSON();
    expect(json2).toEqual({
      algorithm: undefined,
      publicKey: undefined,
      request: undefined,
      signature: undefined,
      status: SubmitCommitmentStatus.AUTHENTICATOR_VERIFICATION_FAILED,
    });

    const decoded2 = await SubmitCommitmentResponse.fromJSON(json2);
    expect(decoded2.status).toBe(SubmitCommitmentStatus.AUTHENTICATOR_VERIFICATION_FAILED);

    // Test response with all fields
    const signingService = new SigningService(
      new Uint8Array(HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000001')),
    );

    const stateHash = DataHash.fromImprint(new Uint8Array(34));
    const transactionHash = DataHash.fromImprint(new Uint8Array([0x01, ...new Uint8Array(33)]));
    const requestId = await RequestId.create(signingService.publicKey, stateHash);

    const signature = Signature.fromJSON(
      'A0B37F8FBA683CC68F6574CD43B39F0343A50008BF6CCEA9D13231D9E7E2E1E411EDC8D307254296264AEBFC3DC76CD8B668373A072FD64665B50000E9FCCE5201',
    );

    const jsonWithRequest = {
      algorithm: 'secp256k1',
      publicKey: HexConverter.encode(signingService.publicKey),
      request: {
        method: 'submitCommitment',
        requestId: requestId.toJSON(),
        service: 'aggregator',
        stateHash: stateHash.toJSON(),
        transactionHash: transactionHash.toJSON(),
      },
      signature: signature.toJSON(),
      status: SubmitCommitmentStatus.SUCCESS,
    };

    const decoded3 = await SubmitCommitmentResponse.fromJSON(jsonWithRequest);
    expect(decoded3.status).toBe(SubmitCommitmentStatus.SUCCESS);
    expect(decoded3.request).toBeDefined();
    expect(decoded3.request?.requestId).toStrictEqual(requestId);
    expect(decoded3.request?.stateHash).toStrictEqual(stateHash);
    expect(decoded3.request?.transactionHash).toStrictEqual(transactionHash);
    expect(decoded3.algorithm).toBe('secp256k1');
    expect(decoded3.publicKey).toBe(HexConverter.encode(signingService.publicKey));
    expect(decoded3.signature).toStrictEqual(signature);

    // Test that toJSON() works with the decoded response
    const json3 = decoded3.toJSON();
    expect(json3.status).toBe(SubmitCommitmentStatus.SUCCESS);
    expect(json3.request).toBeDefined();
    expect(json3.algorithm).toBe('secp256k1');
    expect(json3.publicKey).toBe(HexConverter.encode(signingService.publicKey));
    expect(json3.signature).toBe(signature.toJSON());
  });

  it('should validate JSON structure correctly', () => {
    // Valid JSON structures
    const validJson1 = {
      status: SubmitCommitmentStatus.SUCCESS,
    };
    expect(SubmitCommitmentResponse.isJSON(validJson1)).toBe(true);

    const validJson2 = {
      algorithm: 'secp256k1',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      request: {
        method: 'submitCommitment',
        requestId: '0000ea659cdc838619b3767c057fdf8e6d99fde2680c5d8517eb06761c0878d40c40',
        service: 'aggregator',
        stateHash: '00000000000000000000000000000000000000000000000000000000000000000000',
        transactionHash: '00010000000000000000000000000000000000000000000000000000000000000000',
      },
      signature:
        'a0b37f8fba683cc68f6574cd43b39f0343a50008bf6ccea9d13231d9e7e2e1e411edc8d307254296264aebfc3dc76cd8b668373a072fd64665b50000e9fcce5201',
      status: SubmitCommitmentStatus.AUTHENTICATOR_VERIFICATION_FAILED,
    };
    expect(SubmitCommitmentResponse.isJSON(validJson2)).toBe(true);

    // Invalid JSON structures
    expect(SubmitCommitmentResponse.isJSON(null)).toBe(false);
    expect(SubmitCommitmentResponse.isJSON(undefined)).toBe(false);
    expect(SubmitCommitmentResponse.isJSON('string')).toBe(false);
    expect(SubmitCommitmentResponse.isJSON(123)).toBe(false);
    expect(SubmitCommitmentResponse.isJSON({})).toBe(false);
    expect(SubmitCommitmentResponse.isJSON({ status: 123 })).toBe(false);

    // Missing status
    const missingStatus = {
      algorithm: 'secp256k1',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    };
    expect(SubmitCommitmentResponse.isJSON(missingStatus)).toBe(false);
  });

  it('should handle fromJSON errors correctly', async () => {
    // Test error thrown for invalid JSON
    await expect(SubmitCommitmentResponse.fromJSON({})).rejects.toThrow(
      'Parsing submit state transition response failed.',
    );
    await expect(SubmitCommitmentResponse.fromJSON(null)).rejects.toThrow(
      'Parsing submit state transition response failed.',
    );
    await expect(SubmitCommitmentResponse.fromJSON({ status: 123 })).rejects.toThrow(
      'Parsing submit state transition response failed.',
    );
  });

  it('should test all status types', async () => {
    const statuses = [
      SubmitCommitmentStatus.SUCCESS,
      SubmitCommitmentStatus.AUTHENTICATOR_VERIFICATION_FAILED,
      SubmitCommitmentStatus.REQUEST_ID_MISMATCH,
      SubmitCommitmentStatus.REQUEST_ID_EXISTS,
    ];

    for (const status of statuses) {
      const response = new SubmitCommitmentResponse(status);
      const json = response.toJSON();
      const decoded = await SubmitCommitmentResponse.fromJSON(json);
      expect(decoded.status).toBe(status);
    }
  });

  it('should verify receipt correctly', async () => {
    const signingService = new SigningService(
      new Uint8Array(HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000001')),
    );

    const stateHash = DataHash.fromImprint(new Uint8Array(34));
    const transactionHash = DataHash.fromImprint(new Uint8Array([0x01, ...new Uint8Array(33)]));
    const requestId = await RequestId.create(signingService.publicKey, stateHash);

    // Test successful receipt verification with properly signed receipt
    const response = new SubmitCommitmentResponse(SubmitCommitmentStatus.SUCCESS);
    await response.addSignedReceipt(requestId, stateHash, transactionHash, signingService);

    expect(await response.verifyReceipt()).toBe(true);

    expect(response.algorithm).toBe('secp256k1');
    expect(response.publicKey).toBe(HexConverter.encode(signingService.publicKey));
    expect(response.signature).toBeDefined();
    expect(response.request).toBeDefined();
    expect(response.request?.service).toBe('aggregator');
    expect(response.request?.method).toBe('submit_commitment');
    expect(response.request?.requestId).toStrictEqual(requestId);
    expect(response.request?.stateHash).toStrictEqual(stateHash);
    expect(response.request?.transactionHash).toStrictEqual(transactionHash);

    // Test that JSON serialization and deserialization preserves verification
    const json = response.toJSON();
    const deserializedResponse = await SubmitCommitmentResponse.fromJSON(json);
    expect(await deserializedResponse.verifyReceipt()).toBe(true);

    // Test responses without required fields for verification should fail
    const responseNoSignature = new SubmitCommitmentResponse(SubmitCommitmentStatus.SUCCESS);
    expect(await responseNoSignature.verifyReceipt()).toBe(false);

    const responseNoPublicKey = new SubmitCommitmentResponse(
      SubmitCommitmentStatus.SUCCESS,
      undefined,
      'secp256k1',
      undefined,
      response.signature, // Use the real signature but no public key
    );
    expect(await responseNoPublicKey.verifyReceipt()).toBe(false);

    const responseNoRequest = new SubmitCommitmentResponse(
      SubmitCommitmentStatus.SUCCESS,
      undefined, // No request
      'secp256k1',
      HexConverter.encode(signingService.publicKey),
      response.signature,
    );
    expect(await responseNoRequest.verifyReceipt()).toBe(false);

    // Test with wrong signature should fail verification
    const wrongSigningService = new SigningService(
      new Uint8Array(HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000002')),
    );
    const responseWrongSignature = new SubmitCommitmentResponse(SubmitCommitmentStatus.SUCCESS);
    await responseWrongSignature.addSignedReceipt(requestId, stateHash, transactionHash, wrongSigningService);

    // Tamper with the public key to mismatch the signature
    (responseWrongSignature as SubmitCommitmentResponse & { publicKey?: string }).publicKey = HexConverter.encode(
      signingService.publicKey,
    );
    expect(await responseWrongSignature.verifyReceipt()).toBe(false);
  });
});
