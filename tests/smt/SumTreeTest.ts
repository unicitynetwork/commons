'use strict';

import { HashAlgorithm } from '../../src/hash/DataHasher.js';
import { CoinData, CoinDataMap, CoinDataUtils } from '../../src/smt/CoinData.js';
import { SumTree } from '../../src/smt/SumTree.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('SumTree', () => {
  let tree: SumTree;

  beforeEach(async () => {
    tree = await SumTree.create(HashAlgorithm.SHA256);
  });

  const createCoinData = (id: string, value: bigint): CoinDataMap => {
    const map = new Map<string, bigint>();
    map.set(id, value);
    return map;
  };

  it('should create an empty tree', () => {
    expect(tree.rootHash).toBeDefined();
    expect(tree.coinData.size).toBe(0);
    expect(tree.getTotalValue()).toBe(0n);
  });

  it('should add leaf nodes with coin data', async () => {
    // Create coin data maps with hex IDs
    const coinData1 = createCoinData('0000', 100n);
    const coinData2 = createCoinData('0001', 200n);
    
    // Add leaves to the tree
    await tree.addLeaf(0b10n, coinData1);
    await tree.addLeaf(0b11n, coinData2);
    
    // Check the total value
    expect(tree.getTotalValue()).toBe(300n);
    
    // Check individual coin values
    expect(tree.getCoinValue(HexConverter.decode('0000'))).toBe(100n);
    expect(tree.getCoinValue(HexConverter.decode('0001'))).toBe(200n);
    expect(tree.getCoinValue(HexConverter.decode('0002'))).toBe(0n); // Non-existent coin
  });

  it('should handle multiple coins in a single leaf', async () => {
    // Create a leaf with multiple coins
    const coinData = new Map<string, bigint>();
    coinData.set('aabb', 50n);
    coinData.set('ccdd', 75n);
    coinData.set('eeff', 25n);
    
    // Add leaf to the tree
    await tree.addLeaf(0b100n, coinData);
    
    // Check the total value
    expect(tree.getTotalValue()).toBe(150n);
    
    // Check individual coin values
    expect(tree.getCoinValue(HexConverter.decode('aabb'))).toBe(50n);
    expect(tree.getCoinValue(HexConverter.decode('ccdd'))).toBe(75n);
    expect(tree.getCoinValue(HexConverter.decode('eeff'))).toBe(25n);
  });

  it('should generate and verify inclusion proofs', async () => {
    // Create a fresh tree for this test to avoid conflicts
    const testTree = await SumTree.create(HashAlgorithm.SHA256);
    
    // Add two leaves at distinct paths
    await testTree.addLeaf(0b10n, createCoinData('0000', 100n));
    await testTree.addLeaf(0b11n, createCoinData('0001', 200n));
    
    // Generate proof for path 0b10
    const proof = testTree.getPath(0b10n);
    
    // Verify the proof
    const verificationResult = await proof.verify(0b10n);
    
    // Check verification results
    expect(verificationResult.result).toBe(true);
    expect(verificationResult.isPathValid).toBe(true);
    expect(verificationResult.isPathIncluded).toBe(true);
    expect(verificationResult.coinData).toBeDefined();
    
    // Check coin data in the proof
    const coinData = verificationResult.coinData;
    expect(coinData).not.toBeNull();
    expect(coinData!.get('0000')).toBe(100n);
    
    // Verify with wrong path should fail
    const wrongVerification = await proof.verify(0b1n);
    expect(wrongVerification.result).toBe(false);
    expect(wrongVerification.isPathIncluded).toBe(false);
  });

  it('should maintain correct sums in parent nodes', async () => {
    // Create a fresh tree for this test
    const testTree = await SumTree.create(HashAlgorithm.SHA256);
    
    // Create leaves with coin data (using hex strings for IDs)
    const coinData1 = createCoinData('abcd', 100n);
    const coinData2 = createCoinData('ef01', 200n);
    
    // Add leaves to the tree
    await testTree.addLeaf(0b10n, coinData1);
    await testTree.addLeaf(0b11n, coinData2);
    
    // Check total value at root
    expect(testTree.getTotalValue()).toBe(300n);
    
    // Verify individual coin values
    expect(testTree.getCoinValue(HexConverter.decode('abcd'))).toBe(100n);
    expect(testTree.getCoinValue(HexConverter.decode('ef01'))).toBe(200n);
  });

  it('should include sibling coin data in proofs', async () => {
    // Create a fresh tree for this test
    const testTree = await SumTree.create(HashAlgorithm.SHA256);
    
    // Add leaves with coin data
    await testTree.addLeaf(0b10n, createCoinData('abcd', 100n));
    await testTree.addLeaf(0b11n, createCoinData('ef01', 200n));
    
    // Generate proof for path 0b10
    const proof = testTree.getPath(0b10n);
    
    // Check that sibling coin data is included in the proof
    const step = proof.steps[0];
    expect(step).not.toBeNull();
    expect(step!.siblingCoinData).not.toBeNull();
    expect(step!.siblingCoinData!.get('ef01')).toBe(200n);
  });
});