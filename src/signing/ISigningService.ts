import { ISignature } from './ISignature.js';

export interface ISigningService<T extends ISignature> {
  readonly publicKey: Uint8Array;
  readonly algorithm: string;
  sign(hash: Uint8Array): Promise<T>;
  verify(hash: Uint8Array, signature: T): Promise<boolean>;
}
