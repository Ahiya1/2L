# Testing Guide - AI Mafia

## Overview

This project uses **Vitest** as the testing framework. Vitest provides fast, modern testing with excellent TypeScript support and ES module compatibility.

## Running Tests

### Basic Commands

```bash
# Run all tests (watch mode)
npm test

# Run tests once (CI mode)
npm test -- --run

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Run Specific Tests

```bash
# Run a single test file
npm test -- src/lib/claude/__tests__/client.simple.test.ts

# Run tests matching a pattern
npm test -- --grep "cost"

# Run tests in a directory
npm test -- src/utils/__tests__/
```

## Writing Tests

### Test File Structure

Place tests in `__tests__` directories next to the code they test:

```
src/
├── lib/
│   ├── claude/
│   │   ├── client.ts
│   │   └── __tests__/
│   │       ├── client.simple.test.ts
│   │       └── mocks.ts
│   └── utils/
│       ├── cost-tracker.ts
│       └── __tests__/
│           └── cost-tracker.test.ts
```

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from '../module';

describe('Module Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('functionToTest', () => {
    it('should do something specific', () => {
      const result = functionToTest(input);

      expect(result).toBe(expectedValue);
    });
  });
});
```

### Mocking

#### Mock Functions

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn().mockReturnValue('result');

// Or with implementation
const mockFn = vi.fn((x: number) => x * 2);

// Verify calls
expect(mockFn).toHaveBeenCalledWith(expectedArg);
expect(mockFn).toHaveBeenCalledTimes(2);
```

#### Mock Modules

```typescript
// Mock an entire module
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: { create: vi.fn() }
  }))
}));

// Import after mocking
import Anthropic from '@anthropic-ai/sdk';
```

#### Mock Environment Variables

```typescript
// Set before importing module
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.NODE_ENV = 'test';
```

### Timers

```typescript
import { vi } from 'vitest';

it('should handle timeouts', async () => {
  vi.useFakeTimers();

  const promise = functionWithTimeout();

  // Advance time
  await vi.advanceTimersByTimeAsync(10000);

  const result = await promise;

  expect(result).toBe(expected);

  vi.useRealTimers();
});
```

### Async Tests

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();

  expect(result).toBeDefined();
});

it('should handle promise rejections', async () => {
  await expect(failingFunction()).rejects.toThrow('Error message');
});
```

## Test Patterns

### Unit Tests

Test individual functions in isolation:

```typescript
describe('calculateCost', () => {
  it('should calculate cost with cache hits', () => {
    const usage = {
      input_tokens: 1000,
      output_tokens: 200,
      cache_read_input_tokens: 500,
      cache_creation_input_tokens: 0,
    };

    const cost = calculateCost(usage);

    expect(cost).toBeCloseTo(0.0075, 6);
  });
});
```

### Integration Tests

Test multiple components working together:

```typescript
describe('Cost Tracker Integration', () => {
  it('should track a complete game with multiple turns', () => {
    const gameId = 'game-test';

    // Simulate 10 turns
    for (let turn = 1; turn <= 10; turn++) {
      costTracker.logUsage(gameId, playerId, playerName, turn, usage);
    }

    const summary = costTracker.getGameSummary(gameId);

    expect(summary.totalTurns).toBe(10);
    expect(summary.totalCost).toBeGreaterThan(0);
  });
});
```

## Coverage

### Coverage Requirements

- **Overall:** >60% lines, functions, branches, statements
- **Critical Paths:** >80% coverage
  - Claude client (cost calculation, validation)
  - Cost tracker (all core functions)
  - Game orchestration (planned)

### View Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# View in browser
open coverage/index.html
```

### Coverage Configuration

Coverage is configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.test.{ts,tsx}',
    'src/**/__tests__/**',
    'src/cli/**',
  ],
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60,
  },
}
```

## Test Organization

### Existing Tests

1. **Claude Client Tests** (`src/lib/claude/__tests__/`)
   - `client.simple.test.ts` - Pure function tests
   - `mocks.ts` - Mock utilities
   - Coverage: calculateCost, validateResponse, generateFallbackResponse

2. **Cost Tracker Tests** (`src/utils/__tests__/`)
   - `cost-tracker.test.ts` - Complete test suite
   - Coverage: 89.47% lines, 84.31% functions
   - Tests: Logging, aggregation, cache hit rate, circuit breaker

3. **Legacy Tests**
   - `repetition-tracker.test.ts` - Phrase tracking
   - `threading.test.ts` - Message threading
   - `turn-scheduler.test.ts` - Turn scheduling
   - `avatar-colors.test.ts` - Avatar color assignment
   - `message-classification.test.ts` - Message classification

## Common Assertions

```typescript
// Equality
expect(value).toBe(5);
expect(value).toEqual({ a: 1 }); // Deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(0.3, 2); // Floating point

// Strings
expect(str).toContain('substring');
expect(str).toMatch(/regex/);

// Arrays/Objects
expect(array).toHaveLength(3);
expect(array).toContain(item);
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ a: 1 });

// Functions
expect(fn).toThrow();
expect(fn).toThrow('Error message');
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg);
expect(fn).toHaveBeenCalledTimes(2);

// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

## Debugging Tests

### Run Tests in Debug Mode

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run single test file
npm test -- src/lib/claude/__tests__/client.simple.test.ts --run

# Run with specific grep pattern
npm test -- --grep "should calculate cost"
```

### Use Console Logs

```typescript
it('should debug something', () => {
  console.log('Debug value:', value);

  expect(value).toBe(expected);
});
```

### Use Vitest UI

```bash
npm run test:ui
```

Opens interactive UI at http://localhost:51204

## Best Practices

### 1. Test Naming

Use descriptive test names that explain what is being tested:

```typescript
// ✅ Good
it('should calculate cost with cache read discount', () => {});
it('should reject responses with forbidden phrases', () => {});

// ❌ Bad
it('test cost', () => {});
it('works', () => {});
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should do something', () => {
  // Arrange - Setup test data
  const input = { value: 5 };

  // Act - Execute the function
  const result = functionToTest(input);

  // Assert - Verify the result
  expect(result).toBe(10);
});
```

### 3. Test One Thing

Each test should verify one specific behavior:

```typescript
// ✅ Good - Tests one thing
it('should calculate cost with input tokens', () => {
  const cost = calculateCost({ input_tokens: 1000, ... });
  expect(cost).toBeCloseTo(0.003, 6);
});

it('should calculate cost with cached tokens', () => {
  const cost = calculateCost({ cache_read_input_tokens: 5000, ... });
  expect(cost).toBeCloseTo(0.0015, 6);
});

// ❌ Bad - Tests multiple things
it('should calculate all costs', () => {
  expect(calculateCost(usage1)).toBe(x);
  expect(calculateCost(usage2)).toBe(y);
  expect(calculateCost(usage3)).toBe(z);
});
```

### 4. Use beforeEach for Setup

```typescript
describe('Cost Tracker', () => {
  beforeEach(() => {
    costTracker.clear(); // Reset state before each test
  });

  it('test 1', () => {
    // Test has clean state
  });

  it('test 2', () => {
    // Test has clean state
  });
});
```

### 5. Test Edge Cases

```typescript
it('should handle zero tokens', () => {
  const cost = calculateCost({ input_tokens: 0, ... });
  expect(cost).toBe(0);
});

it('should handle very large token counts', () => {
  const cost = calculateCost({ input_tokens: 1000000, ... });
  expect(cost).toBeCloseTo(3.0, 2);
});

it('should handle empty string', () => {
  const result = validateResponse('');
  expect(result.isValid).toBe(false);
});
```

## Continuous Integration

Tests run automatically on:
- Pre-commit hooks (planned)
- Pull requests (planned)
- CI/CD pipeline (planned)

To ensure tests pass before pushing:

```bash
# Run all tests
npm test -- --run

# Check coverage
npm run test:coverage
```

## Troubleshooting

### Tests Fail with Module Import Errors

Ensure environment variables are set before importing:

```typescript
// Set env vars BEFORE imports
process.env.ANTHROPIC_API_KEY = 'test-key';

import { module } from '../module';
```

### Mock Not Working

Ensure mocks are defined before imports:

```typescript
// Define mock FIRST
vi.mock('@anthropic-ai/sdk');

// Then import
import Anthropic from '@anthropic-ai/sdk';
```

### Timer Tests Don't Work

Use fake timers and advance them properly:

```typescript
vi.useFakeTimers();

// Advance timers
await vi.advanceTimersByTimeAsync(10000);

// Cleanup
vi.useRealTimers();
```

### Coverage Too Low

Focus on critical paths first:
1. Core business logic
2. API clients
3. Data transformations
4. Error handling

Skip testing:
- Third-party library wrappers
- Simple getters/setters
- Logging statements
- Type definitions

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Mocking Guide](https://vitest.dev/guide/mocking.html)
