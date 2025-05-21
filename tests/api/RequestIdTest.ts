import { RequestId } from '../../src/api/RequestId.js';
import { DataHash } from '../../src/hash/DataHash.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('RequestId', () => {
  it('should encode and decode to exactly same object', async () => {
    const requestId = await RequestId.create(new Uint8Array(20), DataHash.fromImprint(new Uint8Array(34)));

    expect(HexConverter.encode(requestId.toCBOR())).toStrictEqual(
      '5841a0b37f8fba683cc68f6574cd43b39f0343a50008bf6ccea9d13231d9e7e2e1e411edc8d307254296264aebfc3dc76cd8b668373a072fd64665b50000e9fcce5201',
    );
    expect(RequestId.fromCBOR(requestId.toCBOR())).toStrictEqual(requestId);
    expect(requestId.toJSON()).toStrictEqual(
      'a0b37f8fba683cc68f6574cd43b39f0343a50008bf6ccea9d13231d9e7e2e1e411edc8d307254296264aebfc3dc76cd8b668373a072fd64665b50000e9fcce5201',
    );
    expect(RequestId.fromJSON(requestId.toJSON())).toStrictEqual(requestId);
  });
});
