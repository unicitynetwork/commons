# CLAUDE.md - Repository Guidelines

## Build/Lint/Test Commands
- Build: `npm run build` (TypeScript check without emitting)
- Lint: `npm run lint` (all files) or `npm run lint:fix` (auto-fix)
- Test all: `npm run test`
- Test single file: `jest tests/path/to/TestFile.ts`
- Test specific test: `jest -t "test description pattern" tests/path/to/TestFile.ts`

## Code Style Guidelines
- **Naming**: Interfaces prefixed with `I` (PascalCase), static methods (camelCase), static readonly variables (UPPER_CASE)
- **Imports**: Order - builtin, external, internal. Alphabetized with newlines between groups
- **Typing**: Strict TypeScript with explicit function return types required
- **Classes**: Explicit member accessibility modifiers required (`public`, `private`, etc.)
- **Error Handling**: Use appropriate custom error classes (e.g., `HashError`)
- **Module System**: ES modules with `.js` extensions in imports
- **Formatting**: Sorted object keys (when ≥2 keys), consistent camelCase
- **Documentation**: JSDoc comments for classes and public methods