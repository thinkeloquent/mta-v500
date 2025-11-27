#!/usr/bin/env node

/**
 * npm-copy-all-workspaces-pkg.mjs
 *
 * Aggregates dependency information from all workspace packages in a JavaScript/TypeScript
 * monorepo and merges them into the root package.json.
 *
 * Features:
 * - Semantic-version deduplication
 * - Dependency grouping (dependencies, devDependencies, optionalDependencies, peerDependencies)
 * - JSON Lines logging for conflict detection (package.jsonl)
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, unlinkSync, copyFileSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { createRequire } from 'module';
import { glob } from 'glob';
import * as semver from 'semver';

const require = createRequire(import.meta.url);

// Dependency group types
const DEP_GROUPS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

/**
 * Pick the newest compatible semver version between two version strings
 * @param {string} existing - Current version
 * @param {string} incoming - New version to compare
 * @returns {string} - Selected version
 */
function pickNewest(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  // Handle non-semver versions (*, latest, git URLs, file refs)
  const existingClean = semver.coerce(existing);
  const incomingClean = semver.coerce(incoming);

  if (!existingClean || !incomingClean) {
    // Fallback to incoming for non-semver versions
    return incoming;
  }

  try {
    // Compare coerced versions and return the original string of the newer one
    if (semver.gt(incomingClean, existingClean)) {
      return incoming;
    }
    return existing;
  } catch (err) {
    // Fallback on any semver error
    return incoming;
  }
}

/**
 * Create a unique key for package logging
 * @param {string} name - Package name
 * @param {string} version - Package version
 * @param {string} location - Workspace location
 * @param {string} group - Dependency group type
 * @returns {string}
 */
function createPackageKey(name, version, location, group) {
  return `${name}@${version}@${location}@${group}`;
}

/**
 * Log package entry to JSONL file
 * @param {string} logPath - Path to package.jsonl
 * @param {Object} entry - Package entry to log
 */
function logPackageEntry(logPath, entry) {
  const line = JSON.stringify(entry) + '\n';
  appendFileSync(logPath, line);
}

/**
 * Main function to aggregate workspace dependencies
 */
async function main() {
  const cwd = process.cwd();
  const rootPkgPath = join(cwd, 'package.json');
  const logPath = join(cwd, 'package.jsonl');
  const backupPath = join(cwd, 'package.json.backup');

  // Clear previous log file
  if (existsSync(logPath)) {
    unlinkSync(logPath);
  }

  console.log('📦 Starting workspace dependency aggregation...\n');

  // Read root package.json
  if (!existsSync(rootPkgPath)) {
    throw new Error(`Root package.json not found at ${rootPkgPath}`);
  }

  // Save original package.json as backup
  copyFileSync(rootPkgPath, backupPath);
  console.log(`💾 Original package.json saved to: ${backupPath}\n`);

  // Log original package.json dependencies to JSONL
  const originalContent = readFileSync(rootPkgPath, 'utf-8');
  let rootPkg;
  try {
    rootPkg = JSON.parse(originalContent);
  } catch (err) {
    throw new Error(`Failed to parse root package.json: ${err.message}`);
  }

  const originalEntry = {
    type: 'original',
    file: 'package.json',
    dependencies: rootPkg.dependencies || {},
    devDependencies: rootPkg.devDependencies || {},
    optionalDependencies: rootPkg.optionalDependencies || {},
    peerDependencies: rootPkg.peerDependencies || {},
    timestamp: new Date().toISOString()
  };
  logPackageEntry(logPath, originalEntry);

  const workspacePatterns = rootPkg.workspaces || [];
  if (workspacePatterns.length === 0) {
    console.log('⚠️  No workspaces defined in root package.json');
    return;
  }

  console.log(`📂 Found ${workspacePatterns.length} workspace pattern(s):`);
  workspacePatterns.forEach(p => console.log(`   - ${p}`));
  console.log('');

  // Track all packages by group
  const mergedByGroup = {
    dependencies: {},
    devDependencies: {},
    optionalDependencies: {},
    peerDependencies: {}
  };

  // Track conflicts for reporting
  const conflicts = new Map();
  const seenPackages = new Set();
  let totalPackagesLogged = 0;

  // Expand workspace patterns and collect dependencies
  for (const pattern of workspacePatterns) {
    const matches = await glob(pattern, { cwd });

    for (const match of matches) {
      const workspacePath = resolve(cwd, match);
      const workspacePkgPath = join(workspacePath, 'package.json');

      if (!existsSync(workspacePkgPath)) {
        continue;
      }

      let workspacePkg;
      try {
        workspacePkg = JSON.parse(readFileSync(workspacePkgPath, 'utf-8'));
      } catch (err) {
        console.log(`⚠️  Skipping ${match}: Failed to parse package.json - ${err.message}`);
        continue;
      }

      const workspaceName = workspacePkg.name || basename(match);
      console.log(`📁 Processing: ${workspaceName} (${match})`);

      // Log workspace's original dependencies to JSONL
      const workspaceDepsEntry = {
        type: 'workspace',
        workspace: workspaceName,
        location: match,
        dependencies: workspacePkg.dependencies || {},
        devDependencies: workspacePkg.devDependencies || {},
        optionalDependencies: workspacePkg.optionalDependencies || {},
        peerDependencies: workspacePkg.peerDependencies || {},
        timestamp: new Date().toISOString()
      };
      logPackageEntry(logPath, workspaceDepsEntry);

      // Process each dependency group
      for (const group of DEP_GROUPS) {
        const deps = workspacePkg[group] || {};

        for (const [name, version] of Object.entries(deps)) {
          // Create unique key for logging
          const key = createPackageKey(name, version, match, group);

          // Log entry to JSONL
          const logEntry = {
            name,
            version,
            location: match,
            group,
            workspace: workspaceName,
            timestamp: new Date().toISOString()
          };
          logPackageEntry(logPath, logEntry);
          totalPackagesLogged++;

          // Track for conflict detection
          const conflictKey = `${name}@${group}`;
          if (!conflicts.has(conflictKey)) {
            conflicts.set(conflictKey, []);
          }
          conflicts.get(conflictKey).push({
            version,
            location: match,
            workspace: workspaceName
          });

          // Merge with version picking
          const existing = mergedByGroup[group][name];
          if (existing) {
            const selected = pickNewest(existing, version);
            if (existing !== version) {
              // Version conflict detected
              if (selected !== existing) {
                console.log(`   ⬆️  ${name}: ${existing} → ${version} (${group})`);
              }
            }
            mergedByGroup[group][name] = selected;
          } else {
            mergedByGroup[group][name] = version;
          }

          seenPackages.add(name);
        }
      }
    }
  }

  console.log('');

  // Report conflicts
  const conflictEntries = [];
  for (const [key, versions] of conflicts) {
    if (versions.length > 1) {
      const uniqueVersions = [...new Set(versions.map(v => v.version))];
      if (uniqueVersions.length > 1) {
        conflictEntries.push({ key, versions, uniqueVersions });
      }
    }
  }

  if (conflictEntries.length > 0) {
    console.log('⚠️  Version conflicts detected:');
    for (const { key, versions, uniqueVersions } of conflictEntries) {
      console.log(`   ${key}:`);
      for (const v of versions) {
        console.log(`      - ${v.version} (${v.workspace})`);
      }
    }
    console.log('');
  }

  // Merge into root package.json
  // Preserve existing root dependencies and merge workspace dependencies on top

  // Dependencies: spread root devDeps first (for promotion), then root deps, then merged
  rootPkg.dependencies = {
    ...(rootPkg.devDependencies || {}),
    ...(rootPkg.dependencies || {}),
    ...mergedByGroup.dependencies
  };

  // DevDependencies: merge workspace devDeps into root
  rootPkg.devDependencies = {
    ...(rootPkg.devDependencies || {}),
    ...mergedByGroup.devDependencies
  };

  // OptionalDependencies: merge if any exist
  if (Object.keys(mergedByGroup.optionalDependencies).length > 0) {
    rootPkg.optionalDependencies = {
      ...(rootPkg.optionalDependencies || {}),
      ...mergedByGroup.optionalDependencies
    };
  }

  // PeerDependencies: merge if any exist
  if (Object.keys(mergedByGroup.peerDependencies).length > 0) {
    rootPkg.peerDependencies = {
      ...(rootPkg.peerDependencies || {}),
      ...mergedByGroup.peerDependencies
    };
  }

  // Sort dependencies alphabetically for readability
  for (const group of DEP_GROUPS) {
    if (rootPkg[group]) {
      rootPkg[group] = Object.fromEntries(
        Object.entries(rootPkg[group]).sort(([a], [b]) => a.localeCompare(b))
      );
    }
  }

  // Write updated package.json
  try {
    writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
    console.log('✅ Updated root package.json');
  } catch (err) {
    throw new Error(`Failed to write root package.json: ${err.message}`);
  }

  // Summary
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - Total packages logged: ${totalPackagesLogged}`);
  console.log(`   - Unique packages: ${seenPackages.size}`);
  console.log(`   - Dependencies: ${Object.keys(rootPkg.dependencies || {}).length}`);
  console.log(`   - DevDependencies: ${Object.keys(rootPkg.devDependencies || {}).length}`);
  if (rootPkg.optionalDependencies) {
    console.log(`   - OptionalDependencies: ${Object.keys(rootPkg.optionalDependencies).length}`);
  }
  if (rootPkg.peerDependencies) {
    console.log(`   - PeerDependencies: ${Object.keys(rootPkg.peerDependencies).length}`);
  }
  console.log(`   - Conflicts: ${conflictEntries.length}`);
  console.log('');
  console.log(`📝 Package log written to: ${logPath}`);
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   npm install');
  console.log('');

  // Log final summary to JSONL
  const summaryEntry = {
    type: 'summary',
    totalPackagesLogged,
    uniquePackages: seenPackages.size,
    dependencies: Object.keys(rootPkg.dependencies || {}).length,
    devDependencies: Object.keys(rootPkg.devDependencies || {}).length,
    optionalDependencies: Object.keys(rootPkg.optionalDependencies || {}).length,
    peerDependencies: Object.keys(rootPkg.peerDependencies || {}).length,
    conflicts: conflictEntries.length,
    timestamp: new Date().toISOString()
  };
  logPackageEntry(logPath, summaryEntry);
}

// Run main
main().catch(err => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
