#!/usr/bin/env node
/**
 * copy-frontend-dist.mjs
 *
 * Copies built frontend dist folders to the static directory with proper error handling.
 * Unlike shell scripts, this fails fast and provides clear error messages.
 *
 * Patterns:
 *   fastify-apps/{app_name}/frontend/dist → /static/app/{app_name}/frontend/dist
 *   fastapi-apps/{app_name}/frontend/dist → /static/app/{app_name}/frontend/dist
 *
 * Usage:
 *   node .bin/copy-frontend-dist.mjs [app-base] [dest-base]
 *
 * Defaults:
 *   app-base: <project-root> (parent of .bin directory)
 *   dest-base: <project-root>/static/app
 *
 * Exit codes:
 *   0 - Success (at least one frontend copied)
 *   1 - Error (missing directories, copy failures, or no frontends found)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get project root (parent of .bin directory)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ANSI colors for terminal output
const colors = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// Parse arguments (default to project root)
const appBase = process.argv[2] || projectRoot;
const destBase = process.argv[3] || path.join(projectRoot, 'static', 'app');

// Source directories to scan (relative to appBase)
const SOURCE_DIRS = ['fastify-apps', 'fastapi-apps'];

console.log(colors.bold('copy-frontend-dist.mjs - Copy built frontends to static directory\n'));
console.log(`App base:    ${appBase}`);
console.log(`Dest base:   ${destBase}`);
console.log(`Scanning:    ${SOURCE_DIRS.join(', ')}\n`);

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
function verifyDist(distPath) {
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

/**
 * Process a single source directory (fastify-apps or fastapi-apps)
 */
function processSourceDir(sourceDir, sourceName) {
  if (!fs.existsSync(sourceDir)) {
    console.log(colors.yellow(`  ${sourceName}: Directory not found, skipping`));
    return;
  }

  let appDirs;
  try {
    appDirs = fs.readdirSync(sourceDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch (err) {
    results.errors.push({
      appName: sourceName,
      error: `Cannot read source directory: ${err.message}`,
      path: sourceDir,
    });
    return;
  }

  if (appDirs.length === 0) {
    console.log(colors.yellow(`  ${sourceName}: No app directories found`));
    return;
  }

  console.log(`  ${colors.magenta(sourceName)}: Found ${appDirs.length} app(s): ${appDirs.join(', ')}`);

  // Process each app in this source directory
  for (const appName of appDirs) {
    const frontendPath = path.join(sourceDir, appName, 'frontend');
    const distPath = path.join(frontendPath, 'dist');
    const fullAppName = `${sourceName}/${appName}`;

    // Check if this app has a frontend
    if (!fs.existsSync(frontendPath)) {
      results.skipped.push({ appName: fullAppName, reason: 'No frontend/ directory' });
      continue;
    }

    // Check if frontend has been built
    if (!fs.existsSync(distPath)) {
      results.errors.push({
        appName: fullAppName,
        error: `Frontend exists but dist/ is missing. Did the build fail?`,
        path: frontendPath,
      });
      continue;
    }

    // Check if dist has content
    let distContents;
    try {
      distContents = fs.readdirSync(distPath);
    } catch (err) {
      results.errors.push({
        appName: fullAppName,
        error: `Cannot read dist directory: ${err.message}`,
        path: distPath,
      });
      continue;
    }

    if (distContents.length === 0) {
      results.errors.push({
        appName: fullAppName,
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
      const issues = verifyDist(destDir);
      const fileCount = countFiles(destDir);

      results.copied.push({
        appName: fullAppName,
        source: distPath,
        dest: destDir,
        fileCount,
        issues,
      });
    } catch (err) {
      results.errors.push({
        appName: fullAppName,
        error: `Copy failed: ${err.message}`,
        path: distPath,
      });
    }
  }
}

// Validate app base exists
if (!fs.existsSync(appBase)) {
  console.error(colors.red(`ERROR: App base directory does not exist: ${appBase}`));
  process.exit(1);
}

// Create destination base
try {
  fs.mkdirSync(destBase, { recursive: true });
} catch (err) {
  console.error(colors.red(`ERROR: Cannot create destination directory: ${err.message}`));
  process.exit(1);
}

// Process each source directory
console.log(colors.bold('Scanning source directories:\n'));
for (const sourceName of SOURCE_DIRS) {
  const sourceDir = path.join(appBase, sourceName);
  processSourceDir(sourceDir, sourceName);
}
console.log();

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
