#!/usr/bin/env node
/**
 * npm-pkg-lock-platform.mjs
 *
 * Removes incomplete platform-specific optional dependency entries from package-lock.json.
 *
 * Problem:
 * When npm generates a lockfile, it only downloads optional dependencies for the current
 * platform (e.g., darwin-arm64 on Mac). Other platform variants get stub entries without
 * version/resolved/integrity fields. When Docker (Linux) runs `npm ci`, it fails with
 * "Invalid Version" because these stub entries are incomplete.
 *
 * Solution:
 * This script removes entries that have `optional: true` but are missing required fields
 * (version, resolved, integrity). These are safe to remove because npm will fetch the
 * correct platform-specific package during installation.
 *
 * Usage:
 *   node .bin/npm-pkg-lock-platform.mjs [path/to/package-lock.json]
 *
 * Default path: ./package-lock.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get lockfile path from args or use default
const lockfilePath = process.argv[2] || 'package-lock.json';
const absolutePath = path.resolve(lockfilePath);

// Check if file exists
if (!fs.existsSync(absolutePath)) {
  console.error(`Error: File not found: ${absolutePath}`);
  process.exit(1);
}

// Read and parse lockfile
let lockfile;
try {
  const content = fs.readFileSync(absolutePath, 'utf8');
  lockfile = JSON.parse(content);
} catch (err) {
  console.error(`Error reading/parsing lockfile: ${err.message}`);
  process.exit(1);
}

// Check lockfile version
if (!lockfile.packages) {
  console.error('Error: Invalid lockfile format (no "packages" field)');
  console.error('This script only supports lockfileVersion 2 or 3');
  process.exit(1);
}

const packages = lockfile.packages;
const removed = [];
const kept = [];

// Identify incomplete optional entries
for (const [key, value] of Object.entries(packages)) {
  // Skip root package
  if (key === '') continue;

  // Check if this is an optional dependency
  if (value.optional) {
    // Check if it's incomplete (missing version, resolved, or integrity)
    const isIncomplete = !value.version || !value.resolved || !value.integrity;

    if (isIncomplete) {
      removed.push(key);
      delete packages[key];
    } else {
      kept.push(key);
    }
  }
}

// Report results
console.log('npm-pkg-lock-platform.js - Remove incomplete platform-specific entries\n');
console.log(`Lockfile: ${absolutePath}`);
console.log(`Lockfile version: ${lockfile.lockfileVersion}\n`);

if (removed.length === 0) {
  console.log('No incomplete optional entries found. Lockfile is clean.');
  process.exit(0);
}

console.log(`Removed ${removed.length} incomplete optional entries:`);
removed.forEach(entry => {
  // Extract package name from path for cleaner output
  const parts = entry.split('node_modules/');
  const pkgName = parts[parts.length - 1];
  console.log(`  - ${pkgName}`);
});

console.log(`\nKept ${kept.length} complete optional entries`);

// Write updated lockfile
try {
  fs.writeFileSync(absolutePath, JSON.stringify(lockfile, null, 2) + '\n');
  console.log(`\nSuccessfully updated ${lockfilePath}`);
} catch (err) {
  console.error(`\nError writing lockfile: ${err.message}`);
  process.exit(1);
}

// Provide next steps
console.log('\nNext steps:');
console.log('  1. Review the changes: git diff package-lock.json');
console.log('  2. Commit and push the updated lockfile');
console.log('  3. Docker builds should now succeed with npm ci');
