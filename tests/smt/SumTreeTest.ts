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
    expect(tree.getAllCoinValues().size).toBe(0);
  });

  it('should add leaf nodes with coin data', async () => {
    // Create coin data maps with hex IDs
    const coinData1 = createCoinData('0000', 100n);
    const coinData2 = createCoinData('0001', 200n);
    
    // Add leaves to the tree
    await tree.addLeaf(0b10n, coinData1);
    await tree.addLeaf(0b11n, coinData2);
    
    // Check the total values for each coin (using string comparison for BigInt)
    expect(tree.getTotalValue(HexConverter.decode('0000')).toString()).toBe('100');
    expect(tree.getTotalValue(HexConverter.decode('0001')).toString()).toBe('200');
    expect(tree.getTotalValue(HexConverter.decode('0002')).toString()).toBe('0'); // Non-existent coin
    
    // Check that values are kept separate
    const allValues = tree.getAllCoinValues();
    expect(allValues.size).toBe(2);
    expect(allValues.get('0000')?.toString()).toBe('100');
    expect(allValues.get('0001')?.toString()).toBe('200');
  });

  it('should handle multiple coins in a single leaf', async () => {
    // Create a leaf with multiple coins
    const coinData = new Map<string, bigint>();
    coinData.set('aabb', 50n);
    coinData.set('ccdd', 75n);
    coinData.set('eeff', 25n);
    
    // Add leaf to the tree
    await tree.addLeaf(0b100n, coinData);
    
    // Check the total values for each coin
    expect(tree.getTotalValue(HexConverter.decode('aabb')).toString()).toBe('50');
    expect(tree.getTotalValue(HexConverter.decode('ccdd')).toString()).toBe('75');
    expect(tree.getTotalValue(HexConverter.decode('eeff')).toString()).toBe('25');
    
    // Verify that all coins are present with correct values
    const allValues = tree.getAllCoinValues();
    expect(allValues.size).toBe(3);
    expect(allValues.get('aabb')?.toString()).toBe('50');
    expect(allValues.get('ccdd')?.toString()).toBe('75');
    expect(allValues.get('eeff')?.toString()).toBe('25');
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
    expect(coinData!.get('0000')?.toString()).toBe('100');
    
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
    
    // Check individual coin values
    expect(testTree.getTotalValue(HexConverter.decode('abcd')).toString()).toBe('100');
    expect(testTree.getTotalValue(HexConverter.decode('ef01')).toString()).toBe('200');
    
    // Verify that values are kept separate
    const allValues = testTree.getAllCoinValues();
    expect(allValues.size).toBe(2);
    expect(allValues.get('abcd')?.toString()).toBe('100');
    expect(allValues.get('ef01')?.toString()).toBe('200');
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
    expect(step!.siblingCoinData!.get('ef01')?.toString()).toBe('200');
  });
  
  it('should sum values for the same coin ID from different leaves', async () => {
    // Create a fresh tree for this test
    const testTree = await SumTree.create(HashAlgorithm.SHA256);
    
    // Create leaves with multiple coins including a common coin in both leaves
    const coinData1 = new Map<string, bigint>();
    coinData1.set(HexConverter.encode(HexConverter.decode('coin1')), 100n);
    coinData1.set(HexConverter.encode(HexConverter.decode('common')), 50n);
    
    const coinData2 = new Map<string, bigint>();
    coinData2.set(HexConverter.encode(HexConverter.decode('coin2')), 200n);
    coinData2.set(HexConverter.encode(HexConverter.decode('common')), 60n);
    
    // Add both leaves to the tree
    await testTree.addLeaf(0b10n, coinData1);
    await testTree.addLeaf(0b11n, coinData2);
    
    // Get the hex-encoded keys
    const coinKey1 = HexConverter.encode(HexConverter.decode('coin1'));
    const coinKey2 = HexConverter.encode(HexConverter.decode('coin2'));
    const commonKey = HexConverter.encode(HexConverter.decode('common'));
    
    // Check individual coin values - unique coins have their own values
    expect(testTree.getTotalValue(HexConverter.decode('coin1')).toString()).toBe('100');
    expect(testTree.getTotalValue(HexConverter.decode('coin2')).toString()).toBe('200');
    
    // The common coin should have its values summed across leaves
    expect(testTree.getTotalValue(HexConverter.decode('common')).toString()).toBe('110'); // Should be 50n + 60n
    
    // Verify the coin data map
    const allValues = testTree.getAllCoinValues();
    expect(allValues.size).toBe(3); // 3 distinct coin IDs
    
    expect(allValues.get(coinKey1)?.toString()).toBe('100');
    expect(allValues.get(coinKey2)?.toString()).toBe('200');
    expect(allValues.get(commonKey)?.toString()).toBe('110');  // For common coins, the values are summed
  });
});