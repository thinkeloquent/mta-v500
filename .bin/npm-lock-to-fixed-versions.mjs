#!/usr/bin/env node
/**
 * npm-lock-to-fixed-versions.mjs
 *
 * Analyzes package-lock.json and all workspace package.json files to consolidate
 * dependencies with fixed versions based on what's resolved in the lockfile.
 *
 * Problem:
 * - Workspace packages use various version ranges (^, ~, *, latest)
 * - package-lock.json resolves actual versions but these aren't reflected in package.json
 * - Cross-platform builds fail due to version resolution differences
 *
 * Solution:
 * This script reads ALL resolved versions from package-lock.json (including nested
 * workspace dependencies like react, autoprefixer, postcss) and updates the root
 * package.json with fixed versions consolidated from all workspaces.
 *
 * Features:
 * - Scans all workspace package.json files for dependencies
 * - Extracts resolved versions from package-lock.json
 * - Consolidates all dependencies to root package.json with fixed versions
 * - Semantic version comparison to pick newest when conflicts exist
 * - Creates backup and detailed log
 *
 * Usage:
 *   node .bin/npm-lock-to-fixed-versions.mjs [options]
 *
 * Options:
 *   --dry-run    Show changes without writing
 *   --no-backup  Don't create backup file
 *   --help       Show this help message
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, unlinkSync, copyFileSync } from 'fs';
import { join, resolve, basename } from 'path';
import { glob } from 'glob';
import * as semver from 'semver';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noBackup = args.includes('--no-backup');
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
npm-lock-to-fixed-versions.mjs

Consolidates all workspace dependencies with fixed versions from package-lock.json.

Usage:
  node .bin/npm-lock-to-fixed-versions.mjs [options]

Options:
  --dry-run    Show changes without writing
  --no-backup  Don't create backup file
  --help       Show this help message

Examples:
  node .bin/npm-lock-to-fixed-versions.mjs              # Update package.json
  node .bin/npm-lock-to-fixed-versions.mjs --dry-run    # Preview changes only
`);
  process.exit(0);
}

// Dependency group types
const DEP_GROUPS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

/**
 * Pick the newest compatible semver version between two version strings
 */
function pickNewest(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const existingClean = semver.coerce(existing);
  const incomingClean = semver.coerce(incoming);

  if (!existingClean || !incomingClean) {
    return incoming;
  }

  try {
    if (semver.gt(incomingClean, existingClean)) {
      return incoming;
    }
    return existing;
  } catch (err) {
    return incoming;
  }
}

/**
 * Log entry to JSONL file
 */
function logEntry(logPath, entry) {
  appendFileSync(logPath, JSON.stringify(entry) + '\n');
}

/**
 * Main function
 */
async function main() {
  const cwd = process.cwd();
  const rootPkgPath = join(cwd, 'package.json');
  const lockPath = join(cwd, 'package-lock.json');
  const logPath = join(cwd, 'fixed-versions.jsonl');
  const backupPath = join(cwd, 'package.json.backup');

  console.log('📦 npm-lock-to-fixed-versions.mjs\n');

  if (dryRun) {
    console.log('DRY RUN - No changes will be written\n');
  }

  // Clear previous log
  if (existsSync(logPath)) {
    unlinkSync(logPath);
  }

  // Check files exist
  if (!existsSync(rootPkgPath)) {
    throw new Error('package.json not found');
  }
  if (!existsSync(lockPath)) {
    throw new Error('package-lock.json not found');
  }

  // Read root package.json
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
  const packageLock = JSON.parse(readFileSync(lockPath, 'utf-8'));

  console.log(`Lockfile version: ${packageLock.lockfileVersion}\n`);

  // Extract ALL resolved versions from package-lock.json
  const resolvedVersions = new Map();

  if (packageLock.packages) {
    for (const [pkgPath, pkgData] of Object.entries(packageLock.packages)) {
      if (pkgPath === '') continue;

      // Extract package name from path (handles nested node_modules)
      const parts = pkgPath.split('node_modules/');
      const pkgName = parts[parts.length - 1];

      if (pkgData.version) {
        // Keep the version if not seen, or pick newest
        const existing = resolvedVersions.get(pkgName);
        if (existing) {
          resolvedVersions.set(pkgName, pickNewest(existing, pkgData.version));
        } else {
          resolvedVersions.set(pkgName, pkgData.version);
        }
      }
    }
  }

  console.log(`📊 Resolved ${resolvedVersions.size} packages from lockfile\n`);

  // Get workspace patterns
  const workspacePatterns = rootPkg.workspaces || [];
  if (workspacePatterns.length === 0) {
    console.log('⚠️  No workspaces defined in root package.json');
  } else {
    console.log(`📂 Found ${workspacePatterns.length} workspace pattern(s):`);
    workspacePatterns.forEach(p => console.log(`   - ${p}`));
    console.log('');
  }

  // Track all dependencies from all workspaces
  const allDeps = {
    dependencies: new Map(),
    devDependencies: new Map(),
    optionalDependencies: new Map(),
    peerDependencies: new Map()
  };

  // Track sources for logging
  const sources = new Map();

  // Process root package.json dependencies first
  for (const group of DEP_GROUPS) {
    const deps = rootPkg[group] || {};
    for (const [name, version] of Object.entries(deps)) {
      allDeps[group].set(name, version);
      if (!sources.has(name)) sources.set(name, []);
      sources.get(name).push({ location: 'root', group, version });
    }
  }

  // Process all workspace package.json files
  for (const pattern of workspacePatterns) {
    const matches = await glob(pattern, { cwd });

    for (const match of matches) {
      const workspacePath = resolve(cwd, match);
      const workspacePkgPath = join(workspacePath, 'package.json');

      if (!existsSync(workspacePkgPath)) continue;

      let workspacePkg;
      try {
        workspacePkg = JSON.parse(readFileSync(workspacePkgPath, 'utf-8'));
      } catch (err) {
        console.log(`⚠️  Skipping ${match}: ${err.message}`);
        continue;
      }

      const workspaceName = workspacePkg.name || basename(match);
      console.log(`📁 Processing: ${workspaceName}`);

      // Collect dependencies from this workspace
      for (const group of DEP_GROUPS) {
        const deps = workspacePkg[group] || {};

        for (const [name, version] of Object.entries(deps)) {
          // Skip workspace references
          if (version.startsWith('workspace:')) continue;

          // Track source
          if (!sources.has(name)) sources.set(name, []);
          sources.get(name).push({ location: match, group, version });

          // Merge with version picking
          const existing = allDeps[group].get(name);
          if (existing) {
            allDeps[group].set(name, pickNewest(existing, version));
          } else {
            allDeps[group].set(name, version);
          }
        }
      }
    }
  }

  console.log('');

  // Now convert all dependencies to fixed versions from lockfile
  const changes = [];
  const notFound = [];

  const fixedDeps = {
    dependencies: {},
    devDependencies: {},
    optionalDependencies: {},
    peerDependencies: {}
  };

  for (const group of DEP_GROUPS) {
    for (const [name, currentVersion] of allDeps[group]) {
      // Skip special versions
      if (currentVersion.startsWith('workspace:') ||
          currentVersion.startsWith('file:') ||
          currentVersion.startsWith('git:') ||
          currentVersion.startsWith('git+') ||
          currentVersion.startsWith('http:') ||
          currentVersion.startsWith('https:')) {
        fixedDeps[group][name] = currentVersion;
        continue;
      }

      // Get resolved version from lockfile
      const resolvedVersion = resolvedVersions.get(name);

      if (!resolvedVersion) {
        notFound.push({ name, group, currentVersion });
        // Keep original version if not found in lockfile
        fixedDeps[group][name] = currentVersion;
        continue;
      }

      // Check if version changed
      if (currentVersion !== resolvedVersion) {
        changes.push({
          name,
          group,
          from: currentVersion,
          to: resolvedVersion
        });
      }

      fixedDeps[group][name] = resolvedVersion;

      // Log entry
      logEntry(logPath, {
        name,
        group,
        original: currentVersion,
        fixed: resolvedVersion,
        sources: sources.get(name),
        timestamp: new Date().toISOString()
      });
    }
  }

  // Sort dependencies alphabetically
  for (const group of DEP_GROUPS) {
    fixedDeps[group] = Object.fromEntries(
      Object.entries(fixedDeps[group]).sort(([a], [b]) => a.localeCompare(b))
    );
  }

  // Report results
  console.log('📊 Results:\n');

  if (notFound.length > 0) {
    console.log(`⚠️  ${notFound.length} packages not found in lockfile:`);
    notFound.slice(0, 10).forEach(({ name, group }) => {
      console.log(`   - ${name} (${group})`);
    });
    if (notFound.length > 10) {
      console.log(`   ... and ${notFound.length - 10} more`);
    }
    console.log('');
  }

  if (changes.length === 0) {
    console.log('✅ All dependencies already use fixed versions.');
  } else {
    console.log(`🔧 ${changes.length} dependencies will be updated:\n`);

    // Group by section for display
    const byGroup = {};
    for (const change of changes) {
      if (!byGroup[change.group]) byGroup[change.group] = [];
      byGroup[change.group].push(change);
    }

    for (const [group, groupChanges] of Object.entries(byGroup)) {
      console.log(`${group}:`);
      groupChanges.slice(0, 20).forEach(({ name, from, to }) => {
        console.log(`  ${name}: ${from} → ${to}`);
      });
      if (groupChanges.length > 20) {
        console.log(`  ... and ${groupChanges.length - 20} more`);
      }
      console.log('');
    }
  }

  // Summary
  console.log('📊 Summary:');
  console.log(`   - Dependencies: ${Object.keys(fixedDeps.dependencies).length}`);
  console.log(`   - DevDependencies: ${Object.keys(fixedDeps.devDependencies).length}`);
  if (Object.keys(fixedDeps.optionalDependencies).length > 0) {
    console.log(`   - OptionalDependencies: ${Object.keys(fixedDeps.optionalDependencies).length}`);
  }
  if (Object.keys(fixedDeps.peerDependencies).length > 0) {
    console.log(`   - PeerDependencies: ${Object.keys(fixedDeps.peerDependencies).length}`);
  }
  console.log('');

  // Write changes
  if (!dryRun && changes.length > 0) {
    // Create backup
    if (!noBackup) {
      copyFileSync(rootPkgPath, backupPath);
      console.log(`💾 Backup created: ${backupPath}`);
    }

    // Update root package.json
    rootPkg.dependencies = fixedDeps.dependencies;
    rootPkg.devDependencies = fixedDeps.devDependencies;

    if (Object.keys(fixedDeps.optionalDependencies).length > 0) {
      rootPkg.optionalDependencies = fixedDeps.optionalDependencies;
    }
    if (Object.keys(fixedDeps.peerDependencies).length > 0) {
      rootPkg.peerDependencies = fixedDeps.peerDependencies;
    }

    writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
    console.log(`✅ Updated: ${rootPkgPath}`);

    console.log(`📝 Log written to: ${logPath}`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Review changes: git diff package.json');
    console.log('   2. Run: npm install');
    console.log('   3. Commit both package.json and package-lock.json');
  } else if (dryRun) {
    console.log('\nTo apply changes, run without --dry-run');
  }
}

// Run
main().catch(err => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
