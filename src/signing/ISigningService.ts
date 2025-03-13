export interface ISigningService {
  readonly publicKey: Uint8Array;
  readonly algorithm: string;
  sign(hash: Uint8Array): Promise<Uint8Array>;
  verify(hash: Uint8Array, signature: Uint8Array): Promise<boolean>;
}
