import { DataHasherFactory } from '../../src/hash/DataHasherFactory.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { NodeDataHasher } from '../../src/hash/NodeDataHasher.js';
import { SparseMerkleSumTreeBuilder } from '../../src/smst/SparseMerkleSumTreeBuilder.js';

interface ISumLeaf {
  readonly value: Uint8Array;
  readonly sum: bigint;
}

const textEncoder = new TextEncoder();

describe('Sum-Certifying Tree', function () {
  it('should build a tree with numeric values', async function () {
    const leaves: Map<bigint, ISumLeaf> = new Map([
      [
        0b1000n,
        {
          sum: 10n,
          value: textEncoder.encode('left-1'),
        },
      ],
      [
        0b1001n,
        {
          sum: 20n,
          value: textEncoder.encode('left-2'),
        },
      ],
      [
        0b1010n,
        {
          sum: 30n,
          value: textEncoder.encode('right-1'),
        },
      ],
      [
        0b1011n,
        {
          sum: 40n,
          value: textEncoder.encode('right-2'),
        },
      ],
    ]);

    const tree = new SparseMerkleSumTreeBuilder(new DataHasherFactory(HashAlgorithm.SHA256, NodeDataHasher));
    for (const [path, leaf] of leaves.entries()) {
      tree.addLeaf(path, leaf.value, leaf.sum);
    }
    let root = await tree.calculateRoot();
    expect(root.sum).toEqual(100n);

    for (const leaf of leaves.entries()) {
      const path = root.getPath(leaf[0]);
      await expect(path.verify(leaf[0])).resolves.toEqual({
        isPathIncluded: true,
        isPathValid: true,
        result: true,
      });

      expect(path.sum).toEqual(root.sum);
      expect(path.root.toJSON()).toEqual(root.hash.toJSON());
      expect(path.steps.at(0)?.branch?.value).toEqual(leaf[1].value);
      expect(path.steps.at(0)?.branch?.sum).toEqual(leaf[1].sum);
    }

    tree.addLeaf(0b1110n, new Uint8Array(32), 100n);
    root = await tree.calculateRoot();
    expect(root.sum).toEqual(200n);
  });

  it('should throw error on non positive path or sum', () => {
    const tree = new SparseMerkleSumTreeBuilder(new DataHasherFactory(HashAlgorithm.SHA256, NodeDataHasher));
    expect(() => tree.addLeaf(-1n, new Uint8Array(32), 100n)).toThrow('Path must be larger than 0.');
    expect(() => tree.addLeaf(1n, new Uint8Array(32), -1n)).toThrow('Sum must be a unsigned bigint.');
  });
});
