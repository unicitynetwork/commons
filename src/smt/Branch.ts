import { LeafBranch } from './LeafBranch.js';
import { NodeBranch } from './NodeBranch.js';
import { RootNode } from './RootNode.js';

export type Branch = NodeBranch | LeafBranch | RootNode;
