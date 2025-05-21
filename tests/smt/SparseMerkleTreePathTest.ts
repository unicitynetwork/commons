import { DataHash } from '../../src/hash/DataHash.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { LeafBranch } from '../../src/smt/LeafBranch.js';
import { MerkleTreePath } from '../../src/smt/MerkleTreePath.js';
import { MerkleTreePathStep } from '../../src/smt/MerkleTreePathStep.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('SparseMerkleTreePath', () => {
  it('should encode and decode to exactly same object', async () => {
    const path = new MerkleTreePath(DataHash.fromImprint(new Uint8Array(34)), [
      await MerkleTreePathStep.createFromLeaf(new LeafBranch(HashAlgorithm.SHA256, 0n, new Uint8Array(10)), null),
    ]);

    expect(HexConverter.encode(path.toCBOR())).toStrictEqual(
      '82582200000000000000000000000000000000000000000000000000000000000000000000818340f64a00000000000000000000',
    );
    expect(MerkleTreePath.fromCBOR(path.toCBOR())).toStrictEqual(path);
    expect(path.toJSON()).toEqual({
      root: '00000000000000000000000000000000000000000000000000000000000000000000',
      steps: [{ path: '0', value: '00000000000000000000' }],
    });
    expect(MerkleTreePath.fromJSON(path.toJSON())).toStrictEqual(path);
  });
});
