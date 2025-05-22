import { Authenticator } from '../../src/api/Authenticator.js';
import { InclusionProof, InclusionProofVerificationStatus } from '../../src/api/InclusionProof.js';
import { RequestId } from '../../src/api/RequestId.js';
import { DataHash } from '../../src/hash/DataHash.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { SigningService } from '../../src/signing/SigningService.js';
import { MerkleTreePath } from '../../src/smt/MerkleTreePath.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('InclusionProof', () => {
  const signingService = new SigningService(
    new Uint8Array(HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000001')),
  );
  const transactionHash = DataHash.fromImprint(new Uint8Array(34));
  const authenticator = Authenticator.fromCBOR(
    HexConverter.decode(
      '8469736563703235366b3158210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f817985841a0b37f8fba683cc68f6574cd43b39f0343a50008bf6ccea9d13231d9e7e2e1e411edc8d307254296264aebfc3dc76cd8b668373a072fd64665b50000e9fcce5201582200000000000000000000000000000000000000000000000000000000000000000000',
    ),
  );
  const merkleTreePath = MerkleTreePath.fromCBOR(
    HexConverter.decode(
      '8258220000ceea69ffe5399bae643c9dc6e456b33f17488a5e1f6a497cc6692677c1dbc940818358230100006125902a1b710488f59988ba737c44e33d69e49c2e9ab8e51146b19fc867125ef658220000635f7a05683e8bd119490de02ae3ce67a44c73ced2a5f2da33743269218ab8df',
    ),
  );

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

    expect(HexConverter.encode(inclusionProof.toCBOR())).toStrictEqual(
      '838258220000ceea69ffe5399bae643c9dc6e456b33f17488a5e1f6a497cc6692677c1dbc940818358230100006125902a1b710488f59988ba737c44e33d69e49c2e9ab8e51146b19fc867125ef658220000635f7a05683e8bd119490de02ae3ce67a44c73ced2a5f2da33743269218ab8df8469736563703235366b3158210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f817985841a0b37f8fba683cc68f6574cd43b39f0343a50008bf6ccea9d13231d9e7e2e1e411edc8d307254296264aebfc3dc76cd8b668373a072fd64665b50000e9fcce5201582200000000000000000000000000000000000000000000000000000000000000000000582200000000000000000000000000000000000000000000000000000000000000000000',
    );
    expect(InclusionProof.fromCBOR(inclusionProof.toCBOR())).toStrictEqual(inclusionProof);

    expect(
      InclusionProof.fromCBOR(
        HexConverter.decode(
          '838258220000ceea69ffe5399bae643c9dc6e456b33f17488a5e1f6a497cc6692677c1dbc940818358230100006125902a1b710488f59988ba737c44e33d69e49c2e9ab8e51146b19fc867125ef658220000635f7a05683e8bd119490de02ae3ce67a44c73ced2a5f2da33743269218ab8dff6f6',
        ),
      ),
    ).toStrictEqual(new InclusionProof(merkleTreePath, null, null));
    expect(() =>
      InclusionProof.fromCBOR(
        HexConverter.decode(
          '838258220000CEEA69FFE5399BAE643C9DC6E456B33F17488A5E1F6A497CC6692677C1DBC940818358230100006125902A1B710488F59988BA737C44E33D69E49C2E9AB8E51146B19FC867125EF658220000635F7A05683E8BD119490DE02AE3CE67A44C73CED2A5F2DA33743269218AB8DF8469736563703235366B3158210279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F817985841A0B37F8FBA683CC68F6574CD43B39F0343A50008BF6CCEA9D13231D9E7E2E1E411EDC8D307254296264AEBFC3DC76CD8B668373A072FD64665B50000E9FCCE5201582200000000000000000000000000000000000000000000000000000000000000000000F6',
        ),
      ),
    ).toThrow('Authenticator and transaction hash must be both set or both null.');
    expect(() =>
      InclusionProof.fromCBOR(
        HexConverter.decode(
          '838258220000CEEA69FFE5399BAE643C9DC6E456B33F17488A5E1F6A497CC6692677C1DBC940818358230100006125902A1B710488F59988BA737C44E33D69E49C2E9AB8E51146B19FC867125EF658220000635F7A05683E8BD119490DE02AE3CE67A44C73CED2A5F2DA33743269218AB8DFF6582200000000000000000000000000000000000000000000000000000000000000000000',
        ),
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
    const requestId = await RequestId.create(signingService.publicKey, authenticator.stateHash);
    const inclusionProof = new InclusionProof(merkleTreePath, authenticator, transactionHash);

    expect(await inclusionProof.verify(requestId.toBigInt())).toEqual(InclusionProofVerificationStatus.OK);
    expect(await inclusionProof.verify(100n)).toEqual(InclusionProofVerificationStatus.NOT_INCLUDED);

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
