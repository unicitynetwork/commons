import { SumTreeLeafBranch } from './SumTreeLeafBranch.js';
import { SumTreeNodeBranch } from './SumTreeNodeBranch.js';

/**
 * Type union representing either a leaf or internal node in a Merkle Sum Tree
 */
export type SumTreeBranch = SumTreeLeafBranch | SumTreeNodeBranch;