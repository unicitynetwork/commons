export interface ISignature {
  readonly algorithm: string;
  readonly bytes: Uint8Array;

  toDto(): string;
}
