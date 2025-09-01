import { DataHash } from '../../src/hash/DataHash.js';
import { DataHasherFactory } from '../../src/hash/DataHasherFactory.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { NodeDataHasher } from '../../src/hash/NodeDataHasher.js';
import { MerkleTreePath } from '../../src/smt/MerkleTreePath.js';
import { MerkleTreePathStep } from '../../src/smt/MerkleTreePathStep.js';
import { PendingLeafBranch } from '../../src/smt/PendingLeafBranch.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('SparseMerkleTreePath', () => {
  it('should encode and decode to exactly same object', async () => {
    const path = new MerkleTreePath(DataHash.fromImprint(new Uint8Array(34)), [
      MerkleTreePathStep.create(
        0n,
        await new PendingLeafBranch(0n, new Uint8Array(10)).finalize(
          new DataHasherFactory(HashAlgorithm.SHA256, NodeDataHasher),
        ),
        null,
      ),
    ]);

    expect(HexConverter.encode(path.toCBOR())).toStrictEqual(
      '82582200000000000000000000000000000000000000000000000000000000000000000000818340f6814a00000000000000000000',
    );
    expect(MerkleTreePath.fromCBOR(path.toCBOR())).toStrictEqual(path);
    expect(path.toJSON()).toEqual({
      root: '00000000000000000000000000000000000000000000000000000000000000000000',
      steps: [{ branch: ['00000000000000000000'], path: '0', sibling: null }],
    });
    expect(MerkleTreePath.fromJSON(path.toJSON())).toStrictEqual(path);
  });

  it('should verify inclusion path', async () => {
    const path = MerkleTreePath.fromJSON({
      root: '00001fd5fffc41e26f249d04e435b71dbe86d079711131671ed54431a5e117291b42',
      steps: [
        {
          branch: ['76616c75653030303030303030'],
          path: '16',
          sibling: ['6c5ad75422175395b4b63390e9dea5d0a39017f4750b78cc4b89ac6451265345'],
        },
        {
          branch: [],
          path: '4',
          sibling: ['ed454d5723b169c882ec9ad5e7f73b2bb804ec1a3cf1dd0eb24faa833ffd9eef'],
        },
        {
          branch: [],
          path: '2',
          sibling: ['e61c02aab33310b526224da3f2ed765ecea0e9a7ac5a307bf7736cca38d00067'],
        },
        {
          branch: [],
          path: '2',
          sibling: ['be9ef65f6d3b6057acc7668fcbb23f9a5ae573d21bd5ebc3d9f4eee3a3c706a3'],
        },
      ],
    });

    expect(await path.verify(0b100000000n)).toEqual({ isPathIncluded: true, isPathValid: true, result: true });
    expect(await path.verify(0b100n)).toEqual({ isPathIncluded: false, isPathValid: true, result: false });
  });

  it('should verify non inclusion path', async () => {
    const path = MerkleTreePath.fromJSON({
      root: '000096a296d224f285c67bee93c30f8a309157f0daa35dc5b87e410b78630a09cfc7',
      steps: [
        {
          branch: ['76616c75653030303030303030'],
          path: '16',
          sibling: ['6c5ad75422175395b4b63390e9dea5d0a39017f4750b78cc4b89ac6451265345'],
        },
        {
          branch: null,
          path: '4',
          sibling: null,
        },
      ],
    });

    expect(await path.verify(0b1000000n)).toEqual({ isPathIncluded: false, isPathValid: true, result: false });
  });
});
