import { DataHasher } from '../../src/hash/DataHasher.js';
import { DataHasherFactory } from '../../src/hash/DataHasherFactory.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { NodeDataHasher } from '../../src/hash/NodeDataHasher.js';

describe('Data hasher factory', () => {
  it('should create hasher', () => {
    expect(new DataHasherFactory(DataHasher).create(HashAlgorithm.SHA256)).toBeInstanceOf(DataHasher);
    expect(new DataHasherFactory(NodeDataHasher).create(HashAlgorithm.SHA256)).toBeInstanceOf(NodeDataHasher);
  });
});
