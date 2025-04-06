#!/usr/bin/env node

const { incrementVersion } = require('./versionUtils');

// Get the version type from command-line arguments
const args = process.argv.slice(2);
const type = args[0] || 'patch';

try {
  const newVersion = incrementVersion(type);
  console.log(`\n✅ Successfully updated to version ${newVersion}\n`);
} catch (error) {
  console.error(`\n❌ Error: ${error.message}\n`);
  process.exit(1);
} 