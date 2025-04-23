import { DataHasher } from '../../src/hash/DataHasher.js';
import { HashAlgorithm } from '../../src/hash/HashAlgorithm.js';
import { SigningService } from '../../src/signing/SigningService.js';

describe('Signing Service tests', function () {
  it('Create and verify signature', async () => {
    const privateKey = SigningService.generatePrivateKey();
    const signingService = await SigningService.createFromSecret(privateKey);
    const hash = await new DataHasher(HashAlgorithm.SHA256).update(new Uint8Array([1, 2, 3])).digest();
    const signature = await signingService.sign(hash.data);
    expect(signature).not.toBeNull();
    expect(signature.encode().length).toEqual(65);
    const verificationResult = await signingService.verify(hash.data, signature);
    expect(verificationResult).toBeTruthy();
  });
});
