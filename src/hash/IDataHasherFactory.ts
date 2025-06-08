import { IDataHasher } from './IDataHasher.js';

export interface IDataHasherFactory<T extends IDataHasher> {
  create(): T;
}

