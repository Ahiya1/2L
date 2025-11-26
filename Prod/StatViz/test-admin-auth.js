/**
 * Test Admin Authentication
 *
 * This script verifies that the base64-encoded admin password hash
 * is correctly decoded and works with bcrypt authentication.
 */

const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Import env module to get decoded hash
const { env } = require('./lib/env.ts');

async function testAuth() {
  console.log('=== Admin Authentication Test ===\n');

  // Verify environment variables loaded
  console.log('Environment Variables:');
  console.log('  ADMIN_USERNAME:', env.ADMIN_USERNAME);
  console.log('  ADMIN_PASSWORD_HASH length:', env.ADMIN_PASSWORD_HASH.length);
  console.log('  ADMIN_PASSWORD_HASH format:', env.ADMIN_PASSWORD_HASH.substring(0, 10) + '...');
  console.log('  Valid bcrypt format:', env.ADMIN_PASSWORD_HASH.startsWith('$2a$10$'));
  console.log();

  // Test password verification
  console.log('Password Verification Tests:');

  // Test 1: Correct password
  const correctPassword = 'admin123';
  const result1 = await bcrypt.compare(correctPassword, env.ADMIN_PASSWORD_HASH);
  console.log(`  Test 1 - Correct password ("${correctPassword}"):`, result1 ? '✓ PASS' : '✗ FAIL');

  // Test 2: Wrong password
  const wrongPassword = 'wrongpassword';
  const result2 = await bcrypt.compare(wrongPassword, env.ADMIN_PASSWORD_HASH);
  console.log(`  Test 2 - Wrong password ("${wrongPassword}"):`, !result2 ? '✓ PASS' : '✗ FAIL');

  // Test 3: Empty password
  const emptyPassword = '';
  const result3 = await bcrypt.compare(emptyPassword, env.ADMIN_PASSWORD_HASH);
  console.log(`  Test 3 - Empty password:`, !result3 ? '✓ PASS' : '✗ FAIL');

  console.log();

  // Summary
  const allPassed = result1 && !result2 && !result3;
  console.log('=== Test Summary ===');
  console.log('Status:', allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
  console.log('Admin authentication:', allPassed ? 'WORKING CORRECTLY' : 'NEEDS FIXING');

  process.exit(allPassed ? 0 : 1);
}

testAuth().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
