'use strict';

import { SparseMerkleTree } from '../../src/smt/SparseMerkleTree.js';
import { HexConverter } from '../../src/util/HexConverter.js';
import { HashAlgorithm } from '../../src/hash/DataHasher';

const { SMT, wordArrayToHex } = require('../../src/smt/test.js');

describe('SMT routines', function () {
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


  it('should verify paths', async () => {
    const smt = await SparseMerkleTree.create(HashAlgorithm.SHA256);
    const textEncoder = new TextEncoder();
    const test = new SMT(leavesSparse);
    // console.log(JSON.stringify(test, (key, value) => (typeof value === 'bigint' ? value.toString(2) : value), 2));
    // console.log(wordArrayToHex(test.root.getValue()));
    // console.log(test.getPath(0b10000000n));

    for (const leaf of leavesSparse) {
      await smt.addLeaf(leaf.path, textEncoder.encode(leaf.value));
    }

    expect(smt.addLeaf(0b10000000n, textEncoder.encode('OnPath'))).rejects.toThrow('Cannot add leaf inside branch.');
    expect(smt.addLeaf(0b1000000000n, textEncoder.encode('ThroughLeaf'))).rejects.toThrow(
      'Cannot extend tree through leaf.',
    );

    console.log(smt.toString());

    //console.log(test.getPath(0b10101010n));
    //console.log(smt.getPath(0b10101010n));
    console.log(smt.getPath(0b100n));
    console.log(test.getPath(0b100n));
    //console.log(smt.getPath(0b1n));
    //console.log(test.getPath(0b1n));
    // console.log(HexConverter.encode(smt.rootHash));

    // checkPaths(smt, leavesSparse, (path) => path, true, (requestedPath) => "Path "+requestedPath.toString(2)+" should be included");
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
    const smt = await SparseMerkleTree.create(HashAlgorithm.SHA256);
    const textEncoder = new TextEncoder();

    for (const leaf of leavesSparse) {
      await smt.addLeaf(leaf.path, textEncoder.encode(leaf.value));
    }

    console.log(smt.getPath(0b11010n))

    expect(smt.getPath(0b11010n)).toStrictEqual([]);
    expect(smt.getPath(0b10101010n)).toStrictEqual([]);
  });
});
