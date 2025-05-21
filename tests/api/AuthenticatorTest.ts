import { Authenticator } from '../../src/api/Authenticator.js';
import { RequestId } from '../../src/api/RequestId.js';
import { DataHash } from '../../src/hash/DataHash.js';
import { Signature } from '../../src/signing/Signature.js';
import { SigningService } from '../../src/signing/SigningService.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('Authenticator', () => {
  it('should encode and decode to exactly same object', async () => {
    const signingService = new SigningService(
      new Uint8Array(HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000001')),
    );
    const authenticator = new Authenticator(
      'secp256k1',
      signingService.publicKey,
      Signature.fromJSON(
        'A0B37F8FBA683CC68F6574CD43B39F0343A50008BF6CCEA9D13231D9E7E2E1E411EDC8D307254296264AEBFC3DC76CD8B668373A072FD64665B50000E9FCCE5201',
      ),
      DataHash.fromImprint(new Uint8Array(34)),
    );
    expect(HexConverter.encode(authenticator.toCBOR())).toStrictEqual(
      '8469736563703235366b3158210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f817985841a0b37f8fba683cc68f6574cd43b39f0343a50008bf6ccea9d13231d9e7e2e1e411edc8d307254296264aebfc3dc76cd8b668373a072fd64665b50000e9fcce5201582200000000000000000000000000000000000000000000000000000000000000000000',
    );
    expect(Authenticator.fromCBOR(authenticator.toCBOR())).toStrictEqual(authenticator);
    expect(authenticator.toJSON()).toEqual({
      algorithm: 'secp256k1',
      publicKey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      signature:
        'a0b37f8fba683cc68f6574cd43b39f0343a50008bf6ccea9d13231d9e7e2e1e411edc8d307254296264aebfc3dc76cd8b668373a072fd64665b50000e9fcce5201',
      stateHash: '00000000000000000000000000000000000000000000000000000000000000000000',
    });
    expect(Authenticator.fromJSON(authenticator.toJSON())).toStrictEqual(authenticator);
  });

  it('should calculate request id', async () => {
    const signingService = new SigningService(
      new Uint8Array(HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000001')),
    );
    const authenticator = new Authenticator(
      'secp256k1',
      signingService.publicKey,
      await signingService.sign(new Uint8Array(32)),
      DataHash.fromImprint(new Uint8Array(34)),
    );

    const requestId = await RequestId.create(signingService.publicKey, DataHash.fromImprint(new Uint8Array(34)));
    expect(requestId.equals(await authenticator.calculateRequestId())).toBeTruthy();
  });
});
