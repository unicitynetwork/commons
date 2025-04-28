import { Authenticator } from '../../src/api/Authenticator.js';
import { DataHash } from '../../src/hash/DataHash.js';
import { SigningService } from '../../src/signing/SigningService.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('Authenticator', () => {
  it('should encode and decode to exactly same object', async () => {
    const signingService = new SigningService(
      new Uint8Array(HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000001')),
    );
    const authenticator = new Authenticator(
      signingService.publicKey,
      'secp256k1',
      await signingService.sign(new Uint8Array(32)),
      DataHash.fromImprint(new Uint8Array(34)),
    );
    const bytes = authenticator.encode();
    expect(Authenticator.decode(bytes)).toStrictEqual(authenticator);
  });
});
