# CLAUDE.md

This file provides guidance to Claude (and other coding assistants) when working with this repository.

## Commands
- Build JS files: `npm run build` (compiles to lib/ directory with declaration files)
- Lint check: `npm run lint`
- Fix linting: `npm run lint:fix`
- Run all tests: `npm run test`
- Run CI tests: `npm run test:ci`
- Run single test: `npm test -- -t "test name pattern"`

## Code Style Guidelines
- **TypeScript**: Strict mode, ES2022 target, Node resolution
- **Naming**:
  - Interfaces: PascalCase with 'I' prefix (ISignature)
  - Static methods: camelCase
  - Static readonly variables: UPPER_CASE
- **Imports**:
  - Order: builtin → external → internal
  - Alphabetize imports
  - Newlines between groups
- **Code Quality**:
  - Explicit function return types required
  - Explicit member accessibility required
  - Await required in async functions
  - Sort object keys alphabetically
  - Files must end with *Test.ts for tests
- **Project Purpose**: Cryptographic utils, sparse Merkle trees, signing services, and hashing functionality