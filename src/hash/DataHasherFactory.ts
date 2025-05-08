import { HashAlgorithm } from './HashAlgorithm.js';
import { IDataHasher } from './IDataHasher.js';

export class DataHasherFactory<T extends IDataHasher> {
  public constructor(private readonly _hasherConstructor: new (algorithm: HashAlgorithm) => T) {}

  public create(algorithm: HashAlgorithm): T {
    return new this._hasherConstructor(algorithm);
  }
}
