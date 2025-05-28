import { Authenticator } from '../../src/api/Authenticator.js';
import { InclusionProof, InclusionProofVerificationStatus } from '../../src/api/InclusionProof.js';
import { RequestId } from '../../src/api/RequestId.js';
import { CborEncoder } from '../../src/cbor/CborEncoder.js';
import { DataHash } from '../../src/hash/DataHash.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { Signature } from '../../src/signing/Signature.js';
import { MerkleTreePath } from '../../src/smt/MerkleTreePath.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('InclusionProof', () => {
  const publicKey = HexConverter.decode('0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798');
  const transactionHash = DataHash.fromImprint(new Uint8Array(34));
  const authenticator = new Authenticator(
    'secp256k1',
    publicKey,
    Signature.decode(
      HexConverter.decode(
        'A0B37F8FBA683CC68F6574CD43B39F0343A50008BF6CCEA9D13231D9E7E2E1E411EDC8D307254296264AEBFC3DC76CD8B668373A072FD64665B50000E9FCCE5201',
      ),
    ),
    DataHash.fromImprint(new Uint8Array(34)),
  );

  const merkleTreePath = MerkleTreePath.fromJSON({
    root: '0000CEEA69FFE5399BAE643C9DC6E456B33F17488A5E1F6A497CC6692677C1DBC940',
    steps: [
      {
        branch: ['0000635F7A05683E8BD119490DE02AE3CE67A44C73CED2A5F2DA33743269218AB8DF'],
        path: '7588594300971394838541568248286222591294169947711183361137673310094707450920243806',
        sibling: null,
      },
    ],
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

    expect(await inclusionProof.verify(requestId.toBigInt())).toEqual(InclusionProofVerificationStatus.OK);
    expect(await inclusionProof.verify(100n)).toEqual(InclusionProofVerificationStatus.PATH_NOT_INCLUDED);

    const invalidTransactionHashInclusionProof = new InclusionProof(
      merkleTreePath,
      authenticator,
      new DataHash(
        HashAlgorithm.SHA224,
        HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000000'),
      ),
    );

    expect(await invalidTransactionHashInclusionProof.verify(requestId.toBigInt())).toEqual(
      InclusionProofVerificationStatus.NOT_AUTHENTICATED,
    );
  });
});
