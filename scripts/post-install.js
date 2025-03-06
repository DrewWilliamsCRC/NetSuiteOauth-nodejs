#!/usr/bin/env node

/**
 * Post-Installation Script
 * 
 * This script runs after the package is installed to set up 
 * the environment and configuration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n\x1b[32m%s\x1b[0m', '✅ NetSuite API Toolkit installed successfully!');

// Determine if we're in a global install or a local project
const isGlobalInstall = __dirname.includes('node_modules');
const baseDir = isGlobalInstall ? process.cwd() : path.join(__dirname, '..');

// Create .env file if it doesn't exist
const envExample = path.join(__dirname, '..', '.env.example');
const envFile = path.join(baseDir, '.env');

if (fs.existsSync(envExample) && !fs.existsSync(envFile)) {
  try {
    fs.copyFileSync(envExample, envFile);
    console.log('\x1b[32m%s\x1b[0m', '✓ Created .env file.');
    console.log('\x1b[33m%s\x1b[0m', '  ⚠️ Please update it with your NetSuite credentials before running the app.');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Failed to create .env file:', error.message);
    console.log('\x1b[33m%s\x1b[0m', '  Please manually copy .env.example to .env and configure your credentials.');
  }
}

// Create tokens.json file if it doesn't exist
const tokensFile = path.join(baseDir, 'tokens.json');
if (!fs.existsSync(tokensFile)) {
  try {
    fs.writeFileSync(tokensFile, '{}');
    console.log('\x1b[32m%s\x1b[0m', '✓ Created tokens.json file for storing OAuth tokens.');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Failed to create tokens.json file:', error.message);
  }
}

// Setup instructions
console.log('\n\x1b[36m%s\x1b[0m', '🚀 Getting Started:');
console.log('\n1. Configure your NetSuite credentials in the .env file');
console.log('2. Start the application with one of these commands:');

if (isGlobalInstall) {
  console.log('   • \x1b[1m%s\x1b[0m', 'netsuite-api-toolkit');
} else {
  console.log('   • \x1b[1m%s\x1b[0m', 'npm start');
  console.log('   • \x1b[1m%s\x1b[0m', 'npx netsuite-api-toolkit');
}

console.log('\n3. Access the toolkit at: \x1b[1m%s\x1b[0m', 'http://localhost:3000');
console.log('\n\x1b[36m%s\x1b[0m', '📖 For more information, see the README.md file or visit:');
console.log('\x1b[1m%s\x1b[0m', 'https://github.com/DrewWilliamsCRC/netsuite-api-toolkit');
console.log('\n\x1b[32m%s\x1b[0m', 'Happy NetSuite API exploring! 🎉'); 