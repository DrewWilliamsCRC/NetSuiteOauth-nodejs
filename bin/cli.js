#!/usr/bin/env node

/**
 * NetSuite API Toolkit CLI
 * This script allows the toolkit to be run from anywhere when installed globally
 */

// Check if .env exists and warn if not
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.warn('\x1b[33m%s\x1b[0m', 'Warning: No .env file found in the current directory.');
  console.warn('\x1b[33m%s\x1b[0m', 'The application might not function correctly without NetSuite credentials.');
  console.warn('\x1b[33m%s\x1b[0m', 'Please copy .env.example to .env and configure your credentials.\n');
}

console.log('\x1b[36m%s\x1b[0m', 'Starting NetSuite API Toolkit...');
console.log('\x1b[36m%s\x1b[0m', 'Once running, access the toolkit at: http://localhost:3000\n');

// Import the main application
require('../src/app.js'); 