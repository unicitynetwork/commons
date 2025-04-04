import { DataHash } from '../../src/hash/DataHash.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';

describe('Data hash', () => {
  it('should use correct dto', () => {
    const hash = new DataHash(HashAlgorithm.SHA256, new Uint8Array(32));
    expect(hash.toDto()).toEqual('00000000000000000000000000000000000000000000000000000000000000000000');
    expect(DataHash.fromDto('00010000000000000000000000000000000000000000000000000000000000000000')).toEqual({
      _data: new Uint8Array(32),
      _imprint: new Uint8Array([0x00, 0x01, ...new Uint8Array(32)]),
      algorithm: HashAlgorithm.SHA224,
    });
    expect(DataHash.fromImprint(hash.imprint)).toEqual(hash);

    expect(new DataHash(0b11111111111 as HashAlgorithm, new Uint8Array(32)).toDto()).toStrictEqual(
      '07ff0000000000000000000000000000000000000000000000000000000000000000',
    );
  });
});
