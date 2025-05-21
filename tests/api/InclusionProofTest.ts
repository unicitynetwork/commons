import { Authenticator } from '../../src/api/Authenticator.js';
import { InclusionProof } from '../../src/api/InclusionProof.js';
import { RequestId } from '../../src/api/RequestId.js';
import { Transaction } from '../../src/api/Transaction.js';
import { DataHash } from '../../src/hash/DataHash.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { SigningService } from '../../src/signing/SigningService.js';
import { SparseMerkleTree } from '../../src/smt/SparseMerkleTree.js';
import { HexConverter } from '../../src/util/HexConverter.js';

describe('InclusionProof', () => {
  it('should encode and decode to exactly same object', async () => {
    const signingService = new SigningService(
      new Uint8Array(HexConverter.decode('0000000000000000000000000000000000000000000000000000000000000001')),
    );
    const transactionHash = DataHash.fromImprint(new Uint8Array(34));
    const authenticator = await Authenticator.create(
      signingService,
      transactionHash,
      DataHash.fromImprint(new Uint8Array(34)),
    );
    const smt = new SparseMerkleTree(HashAlgorithm.SHA256);
    const transaction = await Transaction.create(authenticator, transactionHash);
    const requestId = await RequestId.create(signingService.publicKey, authenticator.stateHash);
    smt.addLeaf(requestId.toBigInt(), transaction.leafValue.imprint);
    const inclusionProof = new InclusionProof(await smt.getPath(requestId.toBigInt()), authenticator, transactionHash);

    expect(HexConverter.encode(inclusionProof.toCBOR())).toStrictEqual(
      '838258220000ceea69ffe5399bae643c9dc6e456b33f17488a5e1f6a497cc6692677c1dbc940818358230100006125902a1b710488f59988ba737c44e33d69e49c2e9ab8e51146b19fc867125ef658220000635f7a05683e8bd119490de02ae3ce67a44c73ced2a5f2da33743269218ab8df8469736563703235366b3158210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f817985841a0b37f8fba683cc68f6574cd43b39f0343a50008bf6ccea9d13231d9e7e2e1e411edc8d307254296264aebfc3dc76cd8b668373a072fd64665b50000e9fcce5201582200000000000000000000000000000000000000000000000000000000000000000000582200000000000000000000000000000000000000000000000000000000000000000000',
    );
    expect(InclusionProof.fromCBOR(inclusionProof.toCBOR())).toStrictEqual(inclusionProof);
    expect(inclusionProof.toJSON()).toEqual({
      authenticator: authenticator.toJSON(),
      merkleTreePath: inclusionProof.merkleTreePath.toJSON(),
      transactionHash: '00000000000000000000000000000000000000000000000000000000000000000000',
    });
    expect(InclusionProof.fromJSON(inclusionProof.toJSON())).toStrictEqual(inclusionProof);
  });
});
