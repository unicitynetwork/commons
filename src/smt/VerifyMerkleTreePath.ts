import { MerkleTreePath } from './MerkleTreePath.js';
import { DataHasher, HashAlgorithm } from '../hash/DataHasher.js';
import { BigintConverter } from '../util/BigintConverter.js';
import { HexConverter } from '../util/HexConverter.js';

class MerkleTreePathVerificationResult {
  public readonly result: boolean;

  public constructor(
    public readonly isIntegrityIntact: boolean,
    public readonly isPathIncluded: boolean,
  ) {
    this.result = isIntegrityIntact && isPathIncluded;
  }
}

// TODO: Revisit verification logic at some point
export async function verifyMerkleTreePath(
  requestedPath: bigint,
  path: MerkleTreePath,
): Promise<MerkleTreePathVerificationResult> {
  let currentPath = 1n;
  let currentHash: Uint8Array | null = null;

  for (const step of path.path) {
    if (step === null) {
      currentHash = await new DataHasher(HashAlgorithm.SHA256).update(new Uint8Array(1)).digest();
      continue;
    }

    let hash: Uint8Array;
    if (step.value) {
      hash = await new DataHasher(HashAlgorithm.SHA256)
        .update(BigintConverter.encode(step.path))
        .update(step.value)
        .digest();
    } else {
      hash = await new DataHasher(HashAlgorithm.SHA256)
        .update(BigintConverter.encode(step.path))
        .update(currentHash ?? new Uint8Array(1))
        .digest();
    }

    const siblingHash = step.sibling ?? new Uint8Array(1);
    const isRight = step.path & 1n;
    currentHash = await new DataHasher(HashAlgorithm.SHA256)
      .update(isRight ? siblingHash : hash)
      .update(isRight ? hash : siblingHash)
      .digest();
    const length = BigInt(step.path.toString(2).length - 1);
    currentPath = (currentPath << length) | (step.path & ((1n << length) - 1n));
  }

  return new MerkleTreePathVerificationResult(
    !!currentHash && HexConverter.encode(currentHash) === HexConverter.encode(path.root),
    requestedPath === currentPath,
  );
}
