/**
 * Test script for discussion orchestrator
 *
 * Run with: node --loader ts-node/esm src/lib/discussion/test-orchestrator.ts
 * Or: tsx src/lib/discussion/test-orchestrator.ts
 */

import { testOrchestrator } from './orchestrator';

// Run test
testOrchestrator()
  .then(() => {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Tests failed:', error);
    process.exit(1);
  });
