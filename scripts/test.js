#!/usr/bin/env node

/**
 * Test Script
 * 
 * Basic validation tests for the NetSuite API Toolkit
 */

const fs = require('fs');
const path = require('path');

console.log('Running tests for NetSuite API Toolkit...');

// Array to track test results
const tests = [];

// Test 1: Check if critical files exist
function testFileExists(filePath, description) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    const exists = fs.existsSync(fullPath);
    tests.push({
      name: `File exists: ${description}`,
      path: filePath,
      passed: exists,
      error: exists ? null : 'File not found'
    });
  } catch (error) {
    tests.push({
      name: `File exists: ${description}`,
      path: filePath,
      passed: false,
      error: error.message
    });
  }
}

// Test file existence
testFileExists('src/app.js', 'Main application file');
testFileExists('bin/cli.js', 'CLI entry point');
testFileExists('.env.example', 'Environment variables example');
testFileExists('package.json', 'Package configuration');

// Test 2: Check package.json configuration
try {
  const packageJson = require('../package.json');
  const hasRequiredFields = packageJson.name && packageJson.version && packageJson.main && packageJson.bin;
  tests.push({
    name: 'Package.json configuration',
    passed: hasRequiredFields,
    error: hasRequiredFields ? null : 'Missing required fields in package.json'
  });
} catch (error) {
  tests.push({
    name: 'Package.json configuration',
    passed: false,
    error: error.message
  });
}

// Print test results
console.log('\nTest Results:');
let passCount = 0;
let failCount = 0;

tests.forEach((test, index) => {
  if (test.passed) {
    console.log(`✅ [${index + 1}] PASS: ${test.name}`);
    passCount++;
  } else {
    console.log(`❌ [${index + 1}] FAIL: ${test.name}`);
    console.log(`   Error: ${test.error}`);
    failCount++;
  }
});

console.log(`\n${passCount} tests passed, ${failCount} tests failed.`);

// Exit with appropriate code
if (failCount > 0) {
  console.error('\nTests failed. Fix the issues before publishing.');
  process.exit(1);
} else {
  console.log('\nAll tests passed! The package is ready for publishing.');
  process.exit(0);
} 