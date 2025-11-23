#!/usr/bin/env node
/**
 * copy-frontend-dist.mjs
 *
 * Copies built frontend dist folders to the static directory with proper error handling.
 * Unlike shell scripts, this fails fast and provides clear error messages.
 *
 * Pattern: fastify-apps/{app_name}/frontend/dist → /static/app/{app_name}/frontend/dist
 *
 * Usage:
 *   node .bin/copy-frontend-dist.mjs [source-base] [dest-base]
 *
 * Defaults:
 *   source-base: /app/fastify-apps
 *   dest-base: /static/app
 *
 * Exit codes:
 *   0 - Success (at least one frontend copied)
 *   1 - Error (missing directories, copy failures, or no frontends found)
 */

import fs from 'fs';
import path from 'path';

// ANSI colors for terminal output
const colors = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// Parse arguments
const sourceBase = process.argv[2] || '/app/fastify-apps';
const destBase = process.argv[3] || '/static/app';

console.log(colors.bold('copy-frontend-dist.mjs - Copy built frontends to static directory\n'));
console.log(`Source base: ${sourceBase}`);
console.log(`Dest base:   ${destBase}\n`);

// Track results
const results = {
  copied: [],
  skipped: [],
  errors: [],
};

/**
 * Recursively copy a directory
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Verify the copied files
 */
function verifyDist(distPath, appName) {
  const issues = [];

  // Check for index.html
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    issues.push(`Missing index.html`);
  }

  // Check for assets directory (common in Vite builds)
  const assetsPath = path.join(distPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    issues.push(`Missing assets/ directory`);
  }

  return issues;
}

/**
 * Count files in a directory recursively
 */
function countFiles(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

// Validate source base exists
if (!fs.existsSync(sourceBase)) {
  console.error(colors.red(`ERROR: Source base directory does not exist: ${sourceBase}`));
  process.exit(1);
}

// Find all frontend directories
let appDirs;
try {
  appDirs = fs.readdirSync(sourceBase, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
} catch (err) {
  console.error(colors.red(`ERROR: Cannot read source directory: ${err.message}`));
  process.exit(1);
}

if (appDirs.length === 0) {
  console.error(colors.red(`ERROR: No app directories found in ${sourceBase}`));
  process.exit(1);
}

console.log(`Found ${appDirs.length} app(s): ${appDirs.join(', ')}\n`);

// Create destination base
try {
  fs.mkdirSync(destBase, { recursive: true });
} catch (err) {
  console.error(colors.red(`ERROR: Cannot create destination directory: ${err.message}`));
  process.exit(1);
}

// Process each app
for (const appName of appDirs) {
  const frontendPath = path.join(sourceBase, appName, 'frontend');
  const distPath = path.join(frontendPath, 'dist');

  // Check if this app has a frontend
  if (!fs.existsSync(frontendPath)) {
    results.skipped.push({ appName, reason: 'No frontend/ directory' });
    continue;
  }

  // Check if frontend has been built
  if (!fs.existsSync(distPath)) {
    results.errors.push({
      appName,
      error: `Frontend exists but dist/ is missing. Did the build fail?`,
      path: frontendPath,
    });
    continue;
  }

  // Check if dist has content
  const distContents = fs.readdirSync(distPath);
  if (distContents.length === 0) {
    results.errors.push({
      appName,
      error: `dist/ directory is empty`,
      path: distPath,
    });
    continue;
  }

  // Copy the dist folder
  const destDir = path.join(destBase, appName, 'frontend', 'dist');

  try {
    copyDir(distPath, destDir);

    // Verify the copy
    const issues = verifyDist(destDir, appName);
    const fileCount = countFiles(destDir);

    results.copied.push({
      appName,
      source: distPath,
      dest: destDir,
      fileCount,
      issues,
    });
  } catch (err) {
    results.errors.push({
      appName,
      error: `Copy failed: ${err.message}`,
      path: distPath,
    });
  }
}

// Print results
console.log(colors.bold('Results:\n'));

// Copied
if (results.copied.length > 0) {
  console.log(colors.green(`✓ Copied ${results.copied.length} frontend(s):`));
  for (const { appName, dest, fileCount, issues } of results.copied) {
    console.log(`  ${colors.cyan(appName)}: ${fileCount} files → ${dest}`);
    if (issues.length > 0) {
      for (const issue of issues) {
        console.log(`    ${colors.yellow(`⚠ ${issue}`)}`);
      }
    }
  }
  console.log();
}

// Skipped (not an error - some apps don't have frontends)
if (results.skipped.length > 0) {
  console.log(colors.yellow(`○ Skipped ${results.skipped.length} app(s) (no frontend):`));
  for (const { appName, reason } of results.skipped) {
    console.log(`  ${appName}: ${reason}`);
  }
  console.log();
}

// Errors
if (results.errors.length > 0) {
  console.log(colors.red(`✗ Errors (${results.errors.length}):`));
  for (const { appName, error, path: errPath } of results.errors) {
    console.log(`  ${colors.red(appName)}: ${error}`);
    console.log(`    Path: ${errPath}`);
  }
  console.log();
}

// Summary
console.log(colors.bold('Summary:'));
console.log(`  Copied:  ${results.copied.length}`);
console.log(`  Skipped: ${results.skipped.length}`);
console.log(`  Errors:  ${results.errors.length}`);

// Exit with error if there were failures or nothing was copied
if (results.errors.length > 0) {
  console.log(colors.red('\nBuild failed due to errors above.'));
  process.exit(1);
}

if (results.copied.length === 0) {
  console.log(colors.red('\nNo frontends were copied. Check that builds completed successfully.'));
  process.exit(1);
}

console.log(colors.green('\nAll frontends copied successfully!'));
process.exit(0);
