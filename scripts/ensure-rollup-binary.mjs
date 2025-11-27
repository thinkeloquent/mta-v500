#!/usr/bin/env node
/**
 * Ensures the correct platform-specific rollup binary is installed.
 * This works around npm's optional dependency bug (https://github.com/npm/cli/issues/4828)
 */

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';

const require = createRequire(import.meta.url);

const platform = os.platform(); // 'darwin', 'linux', 'win32'
const arch = os.arch(); // 'arm64', 'x64'

// Map platform-arch combinations to rollup binary packages
const rollupBinaryMap = {
  'darwin-arm64': '@rollup/rollup-darwin-arm64',
  'darwin-x64': '@rollup/rollup-darwin-x64',
  'linux-arm64': '@rollup/rollup-linux-arm64-gnu',
  'linux-x64': '@rollup/rollup-linux-x64-gnu',
  'win32-x64': '@rollup/rollup-win32-x64-msvc',
  'win32-arm64': '@rollup/rollup-win32-arm64-msvc',
};

const key = `${platform}-${arch}`;
const pkg = rollupBinaryMap[key];

if (!pkg) {
  console.log(`No rollup binary mapping for platform: ${key}`);
  process.exit(0);
}

try {
  // Check if already installed
  require.resolve(pkg);
  console.log(`\u2713 ${pkg} already installed`);
} catch {
  console.log(`Installing ${pkg} for ${key}...`);
  try {
    execSync(`pnpm add -w ${pkg} --save-optional --ignore-scripts`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`\u2713 ${pkg} installed successfully`);
  } catch (error) {
    console.error(`Failed to install ${pkg}:`, error.message);
    process.exit(1);
  }
}
