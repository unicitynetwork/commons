export interface ISigningService {
  readonly publicKey: Uint8Array;
  readonly algorithm: string;
  sign(data: Uint8Array): Promise<Uint8Array>;
  verify(hash: Uint8Array, signature: Uint8Array): Promise<boolean>;
}
