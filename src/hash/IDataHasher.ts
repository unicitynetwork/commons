export interface IDataHasher {
  readonly algorithm: string;

  update(data: Uint8Array): this;
  digest(): Promise<Uint8Array>;
  reset(): this;
}
