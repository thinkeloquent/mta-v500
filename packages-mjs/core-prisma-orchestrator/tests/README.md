# Core Prisma Orchestrator Tests

Comprehensive test suite for the `@thinkeloquent/core-prisma-orchestrator` package.

## Structure

```
tests/
├── unit/                      # Unit tests for individual modules
│   ├── config.test.ts         # Config loader and validation tests
│   ├── executor.test.ts       # Command execution tests
│   └── logger.test.ts         # Logger utility tests
├── integration/               # Integration tests for workflows
│   ├── generate.test.ts       # Client generation workflow tests
│   └── migrate.test.ts        # Migration workflow tests
├── __fixtures__/              # Test fixtures and sample data
│   ├── valid-config.json      # Valid configuration example
│   ├── invalid-config.json    # Invalid configuration for error testing
│   ├── circular-deps-config.json  # Circular dependency test case
│   └── test-helpers.ts        # Shared test utilities
└── __mocks__/                 # Mock implementations (if needed)
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npx vitest tests/unit/config.test.ts
```

### Run tests matching pattern
```bash
npx vitest -t "validateConfig"
```

## Test Categories

### Unit Tests

**Config Module** (`unit/config.test.ts`):
- Configuration loading and parsing
- Configuration validation
- Dependency ordering (topological sort)
- Circular dependency detection
- App lookup and path resolution

**Executor Module** (`unit/executor.test.ts`):
- Single app command execution
- Parallel execution with concurrency limiting
- Sequential execution with dependency order
- Error handling and recovery
- Dry run mode
- Environment variable passing

**Logger Module** (`unit/logger.test.ts`):
- Console output formatting
- Log levels (info, success, error, warn)
- Progress indicators
- Section headers

### Integration Tests

**Generate Workflow** (`integration/generate.test.ts`):
- Full client generation for all apps
- Single app generation
- Disabled app filtering
- Error handling and reporting
- Watch mode integration

**Migrate Workflow** (`integration/migrate.test.ts`):
- Development migrations with dependency order
- Single app migrations
- Migration failure handling
- Migration naming
- Production deployment
- Status checking

## Test Utilities

The `__fixtures__/test-helpers.ts` file provides:

- `getFixturePath(filename)` - Get path to fixture file
- `createMockAppConfig(overrides)` - Create mock app configuration
- `createMockConfig(overrides)` - Create mock MTA configuration
- `createMockPrismaSchema(modelName)` - Generate test Prisma schemas

## Mocking Strategy

Tests use Vitest's mocking capabilities to:

1. **Mock `execa`** - Avoid real Prisma CLI calls during tests
2. **Mock logger** - Suppress console output and verify logging
3. **Mock fs/promises** - Control file system operations
4. **Mock temporary directories** - Use real temp dirs for integration tests

## Coverage Goals

Target coverage thresholds:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { yourFunction } from '../src/lib/module.js';

describe('Module Name', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      const result = yourFunction(input);
      expect(result).toEqual(expected);
    });

    it('should handle error case', () => {
      expect(() => yourFunction(badInput)).toThrow();
    });
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Workflow Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should complete full workflow', async () => {
    // Setup test environment
    // Execute workflow
    // Assert results
  });
});
```

## Best Practices

1. **Isolate tests** - Each test should be independent and not affect others
2. **Use mocks wisely** - Mock external dependencies but test real logic
3. **Clear test names** - Use descriptive names that explain what is being tested
4. **Test edge cases** - Include tests for error conditions and boundary cases
5. **Clean up resources** - Always clean up temporary files and mocks in afterEach
6. **Avoid flaky tests** - Don't rely on timing or external state
7. **Keep tests fast** - Unit tests should run in milliseconds

## Continuous Integration

Tests are automatically run on:
- Pull requests
- Main branch commits
- Release builds

Coverage reports are generated and should be maintained above 80%.
