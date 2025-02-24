export type MerkleTreePathStep = { value?: Uint8Array; sibling?: Uint8Array; path: bigint } | null;
export type MerkleTreePath = { path: ReadonlyArray<MerkleTreePathStep>; root: Uint8Array };