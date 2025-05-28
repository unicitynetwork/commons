'use strict';

import { DataHash } from '../../src/hash/DataHash.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { Branch } from '../../src/smt/Branch.js';
import { LeafBranch } from '../../src/smt/LeafBranch.js';
import { NodeBranch } from '../../src/smt/NodeBranch.js';
import { RootNode } from '../../src/smt/RootNode.js';
import { SparseMerkleTree } from '../../src/smt/SparseMerkleTree.js';
import { HexConverter } from '../../src/util/HexConverter.js';

type TreeResult = { path: bigint; hash: string; value?: string; left?: TreeResult; right?: TreeResult };

async function validateTree(branch: Branch | RootNode | null, result?: TreeResult): Promise<void> {
  if (!result) {
    return expect(branch).toBeNull();
  }

  expect(branch).not.toBeNull();
  expect(branch!.path).toStrictEqual(result.path);
  expect((await branch!.calculateHash()).toJSON()).toStrictEqual(result.hash);
  if (result.value) {
    const leaf = branch as LeafBranch;
    expect(leaf.value).toStrictEqual(HexConverter.decode(result.value));
  } else {
    const node = branch as NodeBranch | RootNode;
    validateTree(node.left, result.left);
    validateTree(node.right, result.right);
  }
}

describe('Sparse Merkle Tree tests', function () {
  const leavesSparse = [
    { path: 0b110010000n, value: 'value00010000' },
    { path: 0b100000000n, value: 'value00000000' },
    { path: 0b100010000n, value: 'value00010000' },
    { path: 0b111100101n, value: 'value11100101' },
    { path: 0b1100n, value: 'value100' },
    { path: 0b1011n, value: 'value011' },
    { path: 0b111101111n, value: 'value11101111' },
    { path: 0b10001010n, value: 'value0001010' },
    { path: 0b11010101n, value: 'value1010101' },
  ];

  const builtTree: TreeResult = {
    hash: '00001fd5fffc41e26f249d04e435b71dbe86d079711131671ed54431a5e117291b42',
    left: {
      hash: '0000b88eb563f6203db31815acae80534d0a83a1e5d35ac6295336da0328f0a4c946',
      left: {
        hash: '0000797e6cb3a464df0a2555756fd14a7089ee114236de1059ff42f55f3aa80f205d',
        left: {
          hash: '00000af30980eb2dafde3fbfe94d0d81bff50370852e3645cfc8683104854126495a',
          left: {
            hash: '00009958e723102b3cdf6b2a4f375ae2d377274ff2fa1df914fdde169323ed012f90',
            path: 0b10000n,
            value: '76616c75653030303030303030',
          },
          path: 0b100n,
          right: {
            hash: '00006c5ad75422175395b4b63390e9dea5d0a39017f4750b78cc4b89ac6451265345',
            left: {
              hash: '00003243d06f7400962e0525568129e24f4c31d1c7ee38ba4b52da25e598c2a3c0ee',
              path: 0b10n,
              value: '76616c75653030303130303030',
            },
            path: 0b1001n,
            right: {
              hash: '0000130c5d2898f78b07f559184a4a486b0a30314017ebdfd7e5c0798b409bd29e2f',
              path: 0b11n,
              value: '76616c75653030303130303030',
            },
          },
        },
        path: 0b10n,
        right: {
          hash: '0000ed454d5723b169c882ec9ad5e7f73b2bb804ec1a3cf1dd0eb24faa833ffd9eef',
          path: 0b11n,
          value: '76616c7565313030',
        },
      },
      path: 0b10n,
      right: {
        hash: '0000e61c02aab33310b526224da3f2ed765ecea0e9a7ac5a307bf7736cca38d00067',
        path: 0b1000101n,
        value: '76616c756530303031303130',
      },
    },
    path: 0b1n,
    right: {
      hash: '0000be9ef65f6d3b6057acc7668fcbb23f9a5ae573d21bd5ebc3d9f4eee3a3c706a3',
      left: {
        hash: '00009a0e927ad97b2520411752555ebbf14c412208d7227945998d0dc2ff098daee8',
        left: {
          hash: '00006be1871d6706d4bb81444e437470173b10f1147de8ff42ea53897b093510edc9',
          path: 0b11110n,
          value: '76616c75653131313030313031',
        },
        path: 0b1010n,
        right: {
          hash: '00009f89d61cdc462846294a710a612847a08adc87bbd33793f1c39af73a23f0548e',
          path: 0b1101n,
          value: '76616c756531303130313031',
        },
      },
      path: 0b11n,
      right: {
        hash: '0000d4de84c29c6f07b9d9348208ef2a03c24c2d98592027ab768fb9bd232126e318',
        left: {
          hash: '0000bf4880c723f2f391568ae8e6786cef7ab363ca828513448b9d5b750a1784dc91',
          path: 0b10n,
          value: '76616c7565303131',
        },
        path: 0b11n,
        right: {
          hash: '000066e0f68741cb9c93b458d32cd87ff94e93e4f7f57f5d07bf83be33952bc2363f',
          path: 0b1111011n,
          value: '76616c75653131313031313131',
        },
      },
    },
  };

  it('should verify the tree', async () => {
    const smt = new SparseMerkleTree(HashAlgorithm.SHA256);
    const textEncoder = new TextEncoder();

    for (const leaf of leavesSparse) {
      smt.addLeaf(leaf.path, textEncoder.encode(leaf.value));
    }

    expect(() => smt.addLeaf(0b10000000n, textEncoder.encode('OnPath'))).toThrow('Cannot add leaf inside branch.');
    expect(() => smt.addLeaf(0b1000000000n, textEncoder.encode('ThroughLeaf'))).toThrow(
      'Cannot extend tree through leaf.',
    );

    expect((await smt.root.hash).toJSON()).toStrictEqual(
      '00001fd5fffc41e26f249d04e435b71dbe86d079711131671ed54431a5e117291b42',
    );

    const rootNode = (smt as unknown as { root: RootNode }).root;
    expect(rootNode).toBeInstanceOf(RootNode);
    expect((await rootNode.hash).toJSON()).toStrictEqual(
      '00001fd5fffc41e26f249d04e435b71dbe86d079711131671ed54431a5e117291b42',
    );

    validateTree(rootNode, builtTree);
  });

  it('calculate common path', () => {
    expect(SparseMerkleTree.calculateCommonPath(0b11n, 0b111101111n)).toStrictEqual({ length: 1n, path: 0b11n });
    expect(SparseMerkleTree.calculateCommonPath(0b111101111n, 0b11n)).toStrictEqual({ length: 1n, path: 0b11n });
    expect(SparseMerkleTree.calculateCommonPath(0b110010000n, 0b100010000n)).toStrictEqual({
      length: 7n,
      path: 0b10010000n,
    });
  });

  it('get path', async () => {
    const smt = new SparseMerkleTree(HashAlgorithm.SHA256);
    const textEncoder = new TextEncoder();

    for (const leaf of leavesSparse) {
      smt.addLeaf(leaf.path, textEncoder.encode(leaf.value));
    }

    let path = await smt.getPath(0b11010n);
    await expect(path.verify(0b11010n)).resolves.toEqual({
      isPathIncluded: false,
      isPathValid: true,
      result: false,
    });

    path = await smt.getPath(0b110010000n);
    await expect(path.verify(0b110010000n)).resolves.toEqual({
      isPathIncluded: true,
      isPathValid: true,
      result: true,
    });
    path = await smt.getPath(0b110010000n);
    await expect(path.verify(0b11010n)).resolves.toEqual({
      isPathIncluded: false,
      isPathValid: true,
      result: false,
    });
    path = await smt.getPath(0b10n);
    await expect(path.verify(0b10n)).resolves.toEqual({
      isPathIncluded: true,
      isPathValid: true,
      result: true,
    });
  });

  it('async result', async () => {
    const tree = new SparseMerkleTree(HashAlgorithm.SHA256);
    tree.addLeaf(0b10n, new Uint8Array([1, 2, 3]));
    tree.addLeaf(0b101n, new Uint8Array([4, 5, 6]));

    await expect(tree.root.hash).resolves.toEqual(
      new DataHash(
        HashAlgorithm.SHA256,
        HexConverter.decode('1c84da4abb4a2af2fa49e295032a5fbce583e2b8043a20246c27f327ee38d927'),
      ),
    );
  });
});
