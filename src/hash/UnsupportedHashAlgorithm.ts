export class UnsupportedHashAlgorithm extends Error {
  public constructor(algorithm: HashAlgorithm) {
    super(`Unsupported hash algorithm: ${algorithm}`);

    this.name = 'UnsupportedHashAlgorithm';
  }
}
