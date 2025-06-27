import { BigintConverter } from './BigintConverter.js';
import { HexConverter } from './HexConverter.js';

export class BitString {
  private readonly value: bigint;

  public constructor(data: Uint8Array) {
    this.value = BigInt(`0x01${HexConverter.encode(data)}`);
  }

  public toBigInt(): bigint {
    return this.value;
  }

  public toString(): string {
    return `BitString[${HexConverter.encode(BigintConverter.encode(this.value))}]`;
  }
}
