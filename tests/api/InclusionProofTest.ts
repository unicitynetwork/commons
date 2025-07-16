import { Authenticator } from '../../src/api/Authenticator.js';
import { InclusionProof, InclusionProofVerificationStatus } from '../../src/api/InclusionProof.js';
import { LeafValue } from '../../src/api/LeafValue.js';
import { RequestId } from '../../src/api/RequestId.js';
import { CborEncoder } from '../../src/cbor/CborEncoder.js';
import { DataHash } from '../../src/hash/DataHash.js';
import { DataHasherFactory } from '../../src/hash/DataHasherFactory.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { NodeDataHasher } from '../../src/hash/NodeDataHasher.js';
import { SigningService } from '../../src/signing/SigningService.js';
import { MerkleTreePath } from '../../src/smt/MerkleTreePath.js';
import { SparseMerkleTree } from '../../src/smt/SparseMerkleTree.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('InclusionProof', () => {
  const signingService = new SigningService(
    new Uint8Array(HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000001')),
  );
  const publicKey = signingService.publicKey;
  const transactionHash = DataHash.fromImprint(new Uint8Array(34));
  let authenticator: Authenticator;
  let merkleTreePath: MerkleTreePath;

  beforeAll(async () => {
    authenticator = await Authenticator.create(
      signingService,
      transactionHash,
      DataHash.fromImprint(new Uint8Array(34)),
    );
    const lf = await LeafValue.create(authenticator, transactionHash);
    const smt = new SparseMerkleTree(new DataHasherFactory(HashAlgorithm.SHA256, NodeDataHasher));
    const reqID = (await RequestId.create(publicKey, authenticator.stateHash)).toBitString().toBigInt();
    smt.addLeaf(reqID, lf.bytes);

    const root = await smt.calculateRoot();

    merkleTreePath = root.getPath(reqID);
  });

  it('should encode and decode json', () => {
    const inclusionProof = new InclusionProof(merkleTreePath, authenticator, transactionHash);
    expect(inclusionProof.toJSON()).toEqual({
      authenticator: authenticator.toJSON(),
      merkleTreePath: merkleTreePath.toJSON(),
      transactionHash: transactionHash.toJSON(),
    });

    expect(InclusionProof.fromJSON(inclusionProof.toJSON())).toStrictEqual(inclusionProof);
    expect(
      InclusionProof.fromJSON({
        authenticator: null,
        merkleTreePath: merkleTreePath.toJSON(),
        transactionHash: null,
      }),
    ).toStrictEqual(new InclusionProof(merkleTreePath, null, null));
    expect(() =>
      InclusionProof.fromJSON({
        authenticator: authenticator.toJSON(),
        merkleTreePath: merkleTreePath.toJSON(),
        transactionHash: null,
      }),
    ).toThrow('Authenticator and transaction hash must be both set or both null.');
    expect(() =>
      InclusionProof.fromJSON({
        authenticator: null,
        merkleTreePath: merkleTreePath.toJSON(),
        transactionHash: transactionHash.toJSON(),
      }),
    ).toThrow('Authenticator and transaction hash must be both set or both null.');
  });

  it('should encode and decode cbor', () => {
    const inclusionProof = new InclusionProof(merkleTreePath, authenticator, transactionHash);

    expect(inclusionProof.toCBOR()).toStrictEqual(
      CborEncoder.encodeArray([merkleTreePath.toCBOR(), authenticator.toCBOR(), transactionHash.toCBOR()]),
    );
    expect(InclusionProof.fromCBOR(inclusionProof.toCBOR())).toStrictEqual(inclusionProof);

    expect(
      InclusionProof.fromCBOR(
        CborEncoder.encodeArray([merkleTreePath.toCBOR(), CborEncoder.encodeNull(), CborEncoder.encodeNull()]),
      ),
    ).toStrictEqual(new InclusionProof(merkleTreePath, null, null));
    expect(() =>
      InclusionProof.fromCBOR(
        CborEncoder.encodeArray([merkleTreePath.toCBOR(), authenticator.toCBOR(), CborEncoder.encodeNull()]),
      ),
    ).toThrow('Authenticator and transaction hash must be both set or both null.');
    expect(() =>
      InclusionProof.fromCBOR(
        CborEncoder.encodeArray([merkleTreePath.toCBOR(), CborEncoder.encodeNull(), transactionHash.toCBOR()]),
      ),
    ).toThrow('Authenticator and transaction hash must be both set or both null.');
  });

  it('structure verification', () => {
    expect(() => new InclusionProof(merkleTreePath, authenticator, null)).toThrow(
      'Authenticator and transaction hash must be both set or both null.',
    );
    expect(() => new InclusionProof(merkleTreePath, null, transactionHash)).toThrow(
      'Authenticator and transaction hash must be both set or both null.',
    );
    expect(new InclusionProof(merkleTreePath, null, null)).toEqual({
      authenticator: null,
      merkleTreePath,
      transactionHash: null,
    });

    expect(new InclusionProof(merkleTreePath, authenticator, transactionHash)).toEqual({
      authenticator,
      merkleTreePath,
      transactionHash,
    });
  });

  it('verifies', async () => {
    const requestId = await RequestId.create(publicKey, authenticator.stateHash);
    const inclusionProof = new InclusionProof(merkleTreePath, authenticator, transactionHash);

    expect(await inclusionProof.verify(requestId)).toEqual(InclusionProofVerificationStatus.OK);
    expect(
      await inclusionProof.verify(await RequestId.createFromImprint(new Uint8Array(32), new Uint8Array(34))),
    ).toEqual(InclusionProofVerificationStatus.PATH_NOT_INCLUDED);

    const invalidTransactionHashInclusionProof = new InclusionProof(
      merkleTreePath,
      authenticator,
      new DataHash(
        HashAlgorithm.SHA224,
        HexConverter.decode('FF000000000000000000000000000000000000000000000000000000000000FF'),
      ),
    );

    expect(await invalidTransactionHashInclusionProof.verify(requestId)).toEqual(
      InclusionProofVerificationStatus.NOT_AUTHENTICATED,
    );
  });
});
