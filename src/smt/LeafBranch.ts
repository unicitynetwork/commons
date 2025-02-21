import { hexToBytes } from '@noble/hashes/utils';

import { DataHasher, IHashAlgorithm } from '../hash/DataHasher.js';
import { HexConverter } from '../util/HexConverter.js';
import { dedent } from '../util/StringUtils.js';

export class LeafBranch {
  public constructor(
    public readonly path: bigint,
    public readonly value: Uint8Array,
    private readonly _hash: Uint8Array,
  ) {}

  public get hash(): Uint8Array {
    return new Uint8Array(this._hash);
  }

  public static async create(algorithm: IHashAlgorithm, path: bigint, value: Uint8Array): Promise<LeafBranch> {
    const pathBase16 = path.toString(16);
    const pathHex = (pathBase16.length % 2 !== 0 ? '0' : '') + pathBase16;
    const hash = await new DataHasher(algorithm).update(hexToBytes(pathHex)).update(value).digest();
    return new LeafBranch(path, value, hash);
  }

  public toString(): string {
    return dedent`
      Branch[${this.path.toString(2)}]:
        hash: ${HexConverter.encode(this.hash)} 
        value: ${HexConverter.encode(this.value)}`;
  }
}
