#!/usr/bin/env node

/**
 * npm-pkg-versions-installed
 *
 * NPM package scanner that analyzes installed package versions across workspaces.
 * Scans all package.json files in the CWD (workspace + non-workspace) and provides:
 * - Version aggregation per package
 * - Conflict detection (major version, exact version mismatches)
 * - Outdated package detection
 * - Rules-based validation with configurable rules
 *
 * Output: JSONL log file + formatted console output
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, unlinkSync } from 'fs';
import { join, resolve, relative, dirname } from 'path';
import { glob } from 'glob';
import * as semver from 'semver';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { parseArgs } from 'util';

// ============================================================================
// Constants
// ============================================================================

const DEP_GROUPS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

const DEFAULT_RULES = {
  defaults: {
    shouldBeSameMajorVersion: true,
    shouldBeSameVersion: false,
    allowedVersionRange: { upper: null, lower: null },
    allowPrerelease: false,
    ignorePeerDependencies: true
  },
  packages: {},
  ignorePackages: [],
  ignoreWorkspaces: [],
  severity: {
    majorVersionMismatch: 'error',
    minorVersionMismatch: 'warning',
    patchVersionMismatch: 'info',
    outdated: 'warning',
    deprecated: 'error'
  }
};

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseCliArgs() {
  const options = {
    output: { type: 'string', short: 'o', default: 'installed-versions.jsonl' },
    config: { type: 'string', short: 'c' },
    json: { type: 'boolean', default: false },
    quiet: { type: 'boolean', short: 'q', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    'check-outdated': { type: 'boolean', default: false },
    'no-color': { type: 'boolean', default: false }
  };

  try {
    const { values } = parseArgs({ options, allowPositionals: false });
    return values;
  } catch (err) {
    console.error(chalk.red(`Error parsing arguments: ${err.message}`));
    showHelp();
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
${chalk.bold('npm-pkg-versions-installed')} - NPM package version scanner

${chalk.bold('Usage:')}
  node index.mjs [options]

${chalk.bold('Options:')}
  -o, --output <file>     Output JSONL file (default: installed-versions.jsonl)
  -c, --config <file>     Custom rules config file
      --json              Output as single JSON instead of JSONL
  -q, --quiet             Suppress console output
      --check-outdated    Check for outdated packages (runs npm outdated)
      --no-color          Disable colored output
  -h, --help              Show this help message

${chalk.bold('Examples:')}
  node index.mjs                          # Scan with defaults
  node index.mjs -o report.jsonl          # Custom output file
  node index.mjs --config rules.json      # Use custom rules
  node index.mjs --check-outdated         # Include outdated check
`);
}

// ============================================================================
// Rules Loading
// ============================================================================

/**
 * Load rules from config file with fallback to defaults
 * @param {string} cwd - Current working directory
 * @param {string|undefined} customConfigPath - Custom config path from CLI
 * @returns {Object} Merged rules configuration
 */
function loadRules(cwd, customConfigPath) {
  const defaultConfigPath = join(cwd, 'ci-config', 'npm-pkg-versions-installed', 'rules.json');
  const configPath = customConfigPath || defaultConfigPath;

  let rules = { ...DEFAULT_RULES };

  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const customRules = JSON.parse(configContent);

      // Deep merge rules
      rules = {
        ...DEFAULT_RULES,
        ...customRules,
        defaults: { ...DEFAULT_RULES.defaults, ...(customRules.defaults || {}) },
        packages: { ...DEFAULT_RULES.packages, ...(customRules.packages || {}) },
        severity: { ...DEFAULT_RULES.severity, ...(customRules.severity || {}) }
      };

      return { rules, configPath, loaded: true };
    } catch (err) {
      console.warn(chalk.yellow(`Warning: Failed to load config from ${configPath}: ${err.message}`));
    }
  }

  return { rules, configPath: null, loaded: false };
}

/**
 * Get rules for a specific package
 * @param {Object} rules - Rules configuration
 * @param {string} packageName - Package name
 * @returns {Object} Package-specific rules merged with defaults
 */
function getPackageRules(rules, packageName) {
  const packageRules = rules.packages[packageName] || {};
  return { ...rules.defaults, ...packageRules };
}

/**
 * Check if a package should be ignored based on rules
 * @param {Object} rules - Rules configuration
 * @param {string} packageName - Package name
 * @returns {boolean}
 */
function shouldIgnorePackage(rules, packageName) {
  return rules.ignorePackages.some(pattern => {
    if (pattern.endsWith('*')) {
      return packageName.startsWith(pattern.slice(0, -1));
    }
    return packageName === pattern;
  });
}

// ============================================================================
// Package Discovery
// ============================================================================

/**
 * Discover all package.json files in the project
 * @param {string} cwd - Current working directory
 * @param {Object} rootPkg - Root package.json content
 * @returns {Promise<Array>} Array of package.json paths with metadata
 */
async function discoverPackages(cwd, rootPkg) {
  const packages = [];
  const workspacePatterns = rootPkg.workspaces || [];

  // Add root package.json
  packages.push({
    path: join(cwd, 'package.json'),
    relativePath: 'package.json',
    isRoot: true,
    isWorkspace: false,
    workspaceName: rootPkg.name || 'root'
  });

  // Discover workspace packages
  const workspacePackages = new Set();
  for (const pattern of workspacePatterns) {
    const matches = await glob(pattern, { cwd });
    for (const match of matches) {
      const pkgPath = join(cwd, match, 'package.json');
      if (existsSync(pkgPath)) {
        workspacePackages.add(match);
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          packages.push({
            path: pkgPath,
            relativePath: join(match, 'package.json'),
            isRoot: false,
            isWorkspace: true,
            workspaceName: pkg.name || match
          });
        } catch (err) {
          console.warn(chalk.yellow(`Warning: Failed to parse ${pkgPath}: ${err.message}`));
        }
      }
    }
  }

  // Discover non-workspace packages (other package.json files in CWD)
  const allPackageJsons = await glob('**/package.json', {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
  });

  for (const pkgRelPath of allPackageJsons) {
    const pkgDir = dirname(pkgRelPath);
    const pkgPath = join(cwd, pkgRelPath);

    // Skip if already discovered (root or workspace)
    if (pkgRelPath === 'package.json') continue;
    if (workspacePackages.has(pkgDir)) continue;

    // Check if this is inside a workspace directory
    const isInsideWorkspace = [...workspacePackages].some(ws => pkgDir.startsWith(ws + '/'));
    if (isInsideWorkspace) continue;

    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      packages.push({
        path: pkgPath,
        relativePath: pkgRelPath,
        isRoot: false,
        isWorkspace: false,
        workspaceName: pkg.name || pkgDir
      });
    } catch (err) {
      console.warn(chalk.yellow(`Warning: Failed to parse ${pkgPath}: ${err.message}`));
    }
  }

  return packages;
}

// ============================================================================
// Version Collection
// ============================================================================

/**
 * Collect all package versions from discovered packages
 * @param {Array} packages - Discovered packages
 * @returns {Object} Aggregated version data
 */
function collectVersions(packages) {
  const versions = {}; // { packageName: [{ version, location, group, workspace }] }
  const allEntries = []; // All package entries for JSONL output

  for (const pkg of packages) {
    let pkgContent;
    try {
      pkgContent = JSON.parse(readFileSync(pkg.path, 'utf-8'));
    } catch (err) {
      continue;
    }

    for (const group of DEP_GROUPS) {
      const deps = pkgContent[group] || {};

      for (const [name, version] of Object.entries(deps)) {
        const entry = {
          name,
          version,
          location: pkg.relativePath,
          group,
          workspace: pkg.workspaceName,
          isRoot: pkg.isRoot,
          isWorkspace: pkg.isWorkspace
        };

        allEntries.push(entry);

        if (!versions[name]) {
          versions[name] = [];
        }
        versions[name].push(entry);
      }
    }
  }

  return { versions, allEntries };
}

// ============================================================================
// Analysis
// ============================================================================

/**
 * Analyze collected versions for conflicts
 * @param {Object} versions - Aggregated version data
 * @param {Object} rules - Rules configuration
 * @returns {Object} Analysis results
 */
function analyzeVersions(versions, rules) {
  const analysis = {
    versions: {},      // { packageName: [uniqueVersions] }
    conflicts: {},     // { packageName: [reasons] }
    warnings: {},      // { packageName: [warnings] }
    ruleViolations: {} // { packageName: [violations] }
  };

  for (const [packageName, entries] of Object.entries(versions)) {
    // Skip ignored packages
    if (shouldIgnorePackage(rules, packageName)) {
      continue;
    }

    const packageRules = getPackageRules(rules, packageName);

    // Get unique versions
    const uniqueVersions = [...new Set(entries.map(e => e.version))];
    analysis.versions[packageName] = uniqueVersions;

    if (uniqueVersions.length <= 1) {
      continue; // No conflicts if only one version
    }

    const conflicts = [];
    const warnings = [];
    const violations = [];

    // Parse versions for comparison
    const parsedVersions = uniqueVersions
      .map(v => ({ original: v, parsed: semver.coerce(v) }))
      .filter(v => v.parsed);

    if (parsedVersions.length < 2) {
      // Not enough parseable versions for comparison
      continue;
    }

    // Check for major version conflicts
    const majorVersions = [...new Set(parsedVersions.map(v => v.parsed.major))];
    if (majorVersions.length > 1) {
      const severity = rules.severity.majorVersionMismatch;
      const reason = `Multiple major versions: ${majorVersions.map(m => `${m}.x`).join(' vs ')}`;

      if (packageRules.shouldBeSameMajorVersion) {
        conflicts.push({ reason, severity, type: 'majorVersionMismatch' });
      } else {
        warnings.push({ reason, severity: 'info', type: 'majorVersionMismatch' });
      }
    }

    // Check for exact version mismatch
    if (packageRules.shouldBeSameVersion && uniqueVersions.length > 1) {
      const reason = `Version mismatch: ${uniqueVersions.join(', ')}`;
      violations.push({
        rule: 'shouldBeSameVersion',
        reason,
        severity: rules.severity.minorVersionMismatch
      });
    }

    // Check version range constraints
    if (packageRules.allowedVersionRange) {
      const { upper, lower } = packageRules.allowedVersionRange;

      for (const { original, parsed } of parsedVersions) {
        if (upper && semver.gt(parsed, semver.coerce(upper))) {
          violations.push({
            rule: 'allowedVersionRange.upper',
            reason: `Version ${original} exceeds upper limit ${upper}`,
            severity: 'error'
          });
        }
        if (lower && semver.lt(parsed, semver.coerce(lower))) {
          violations.push({
            rule: 'allowedVersionRange.lower',
            reason: `Version ${original} below lower limit ${lower}`,
            severity: 'error'
          });
        }
      }
    }

    // Check prerelease versions
    if (!packageRules.allowPrerelease) {
      for (const v of uniqueVersions) {
        const parsed = semver.parse(v);
        if (parsed && parsed.prerelease.length > 0) {
          warnings.push({
            reason: `Prerelease version detected: ${v}`,
            severity: 'warning',
            type: 'prerelease'
          });
        }
      }
    }

    // Store results
    if (conflicts.length > 0) {
      analysis.conflicts[packageName] = conflicts;
    }
    if (warnings.length > 0) {
      analysis.warnings[packageName] = warnings;
    }
    if (violations.length > 0) {
      analysis.ruleViolations[packageName] = violations;
    }
  }

  return analysis;
}

/**
 * Check for outdated packages using npm outdated
 * @param {string} cwd - Current working directory
 * @returns {Object|null} Outdated packages info or null if failed
 */
function checkOutdatedPackages(cwd) {
  try {
    // npm outdated returns exit code 1 if there are outdated packages
    const result = execSync('npm outdated --json', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return JSON.parse(result || '{}');
  } catch (err) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ============================================================================
// Output
// ============================================================================

/**
 * Write JSONL output file
 * @param {string} outputPath - Output file path
 * @param {Array} entries - Package entries
 * @param {Object} analysis - Analysis results
 * @param {Object} summary - Summary data
 */
function writeJsonlOutput(outputPath, entries, analysis, summary) {
  // Clear existing file
  if (existsSync(outputPath)) {
    unlinkSync(outputPath);
  }

  // Write package entries
  for (const entry of entries) {
    const line = JSON.stringify({ type: 'package', ...entry, timestamp: new Date().toISOString() });
    appendFileSync(outputPath, line + '\n');
  }

  // Write analysis
  const analysisEntry = {
    type: 'analysis',
    versions: analysis.versions,
    conflicts: analysis.conflicts,
    warnings: analysis.warnings,
    ruleViolations: analysis.ruleViolations,
    timestamp: new Date().toISOString()
  };
  appendFileSync(outputPath, JSON.stringify(analysisEntry) + '\n');

  // Write summary
  const summaryEntry = {
    type: 'summary',
    ...summary,
    timestamp: new Date().toISOString()
  };
  appendFileSync(outputPath, JSON.stringify(summaryEntry) + '\n');
}

/**
 * Write JSON output file (single JSON object)
 * @param {string} outputPath - Output file path
 * @param {Array} entries - Package entries
 * @param {Object} analysis - Analysis results
 * @param {Object} summary - Summary data
 */
function writeJsonOutput(outputPath, entries, analysis, summary) {
  const output = {
    packages: entries,
    analysis,
    summary,
    timestamp: new Date().toISOString()
  };

  writeFileSync(outputPath.replace('.jsonl', '.json'), JSON.stringify(output, null, 2));
}

/**
 * Print formatted console output
 * @param {Object} versions - Aggregated versions
 * @param {Object} analysis - Analysis results
 * @param {Object} summary - Summary data
 * @param {Object} outdated - Outdated packages (optional)
 */
function printConsoleOutput(versions, analysis, summary, outdated) {
  console.log('');
  console.log(chalk.bold.blue('='.repeat(60)));
  console.log(chalk.bold.blue(' NPM Package Versions Scanner Report'));
  console.log(chalk.bold.blue('='.repeat(60)));
  console.log('');

  // Summary
  console.log(chalk.bold('Summary:'));
  console.log(`  Total package entries: ${chalk.cyan(summary.totalEntries)}`);
  console.log(`  Unique packages: ${chalk.cyan(summary.uniquePackages)}`);
  console.log(`  Packages scanned: ${chalk.cyan(summary.packagesScanned)}`);
  console.log(`  Workspaces: ${chalk.cyan(summary.workspaces)}`);
  console.log('');

  // Conflicts
  const conflictCount = Object.keys(analysis.conflicts).length;
  if (conflictCount > 0) {
    console.log(chalk.bold.red(`Conflicts (${conflictCount}):`));
    for (const [pkg, conflicts] of Object.entries(analysis.conflicts)) {
      console.log(`  ${chalk.red('✗')} ${chalk.bold(pkg)}`);
      for (const conflict of conflicts) {
        const icon = conflict.severity === 'error' ? chalk.red('●') : chalk.yellow('●');
        console.log(`      ${icon} ${conflict.reason}`);
      }

      // Show where each version is used
      const pkgVersions = versions[pkg] || [];
      const byVersion = {};
      for (const entry of pkgVersions) {
        if (!byVersion[entry.version]) {
          byVersion[entry.version] = [];
        }
        byVersion[entry.version].push(entry.workspace);
      }
      for (const [ver, workspaces] of Object.entries(byVersion)) {
        console.log(chalk.dim(`        ${ver}: ${workspaces.join(', ')}`));
      }
    }
    console.log('');
  }

  // Warnings
  const warningCount = Object.keys(analysis.warnings).length;
  if (warningCount > 0) {
    console.log(chalk.bold.yellow(`Warnings (${warningCount}):`));
    for (const [pkg, warnings] of Object.entries(analysis.warnings)) {
      console.log(`  ${chalk.yellow('!')} ${chalk.bold(pkg)}`);
      for (const warning of warnings) {
        console.log(`      ${chalk.yellow('●')} ${warning.reason}`);
      }
    }
    console.log('');
  }

  // Rule Violations
  const violationCount = Object.keys(analysis.ruleViolations).length;
  if (violationCount > 0) {
    console.log(chalk.bold.magenta(`Rule Violations (${violationCount}):`));
    for (const [pkg, violations] of Object.entries(analysis.ruleViolations)) {
      console.log(`  ${chalk.magenta('⚠')} ${chalk.bold(pkg)}`);
      for (const violation of violations) {
        console.log(`      ${chalk.magenta('●')} [${violation.rule}] ${violation.reason}`);
      }
    }
    console.log('');
  }

  // Outdated packages
  if (outdated && Object.keys(outdated).length > 0) {
    console.log(chalk.bold.cyan(`Outdated Packages (${Object.keys(outdated).length}):`));
    for (const [pkg, info] of Object.entries(outdated)) {
      const current = info.current || 'N/A';
      const wanted = info.wanted || 'N/A';
      const latest = info.latest || 'N/A';
      console.log(`  ${chalk.cyan('↑')} ${chalk.bold(pkg)}: ${current} → ${wanted} (latest: ${latest})`);
    }
    console.log('');
  }

  // Status
  if (conflictCount === 0 && violationCount === 0) {
    console.log(chalk.green('✓ No conflicts or rule violations detected'));
  } else {
    const total = conflictCount + violationCount;
    console.log(chalk.red(`✗ ${total} issue(s) detected`));
  }

  console.log('');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseCliArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args['no-color']) {
    chalk.level = 0;
  }

  const cwd = process.cwd();
  const rootPkgPath = join(cwd, 'package.json');

  if (!args.quiet) {
    console.log(chalk.bold('NPM Package Versions Scanner'));
    console.log(chalk.dim(`Scanning: ${cwd}`));
    console.log('');
  }

  // Check root package.json exists
  if (!existsSync(rootPkgPath)) {
    console.error(chalk.red(`Error: No package.json found at ${rootPkgPath}`));
    process.exit(1);
  }

  // Load root package.json
  let rootPkg;
  try {
    rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
  } catch (err) {
    console.error(chalk.red(`Error: Failed to parse root package.json: ${err.message}`));
    process.exit(1);
  }

  // Load rules
  const { rules, configPath, loaded } = loadRules(cwd, args.config);
  if (!args.quiet && loaded) {
    console.log(chalk.dim(`Rules loaded from: ${configPath}`));
  }

  // Discover packages
  if (!args.quiet) {
    console.log(chalk.dim('Discovering packages...'));
  }
  const packages = await discoverPackages(cwd, rootPkg);

  if (!args.quiet) {
    const workspaceCount = packages.filter(p => p.isWorkspace).length;
    const nonWorkspaceCount = packages.filter(p => !p.isWorkspace && !p.isRoot).length;
    console.log(chalk.dim(`Found ${packages.length} package.json files (${workspaceCount} workspace, ${nonWorkspaceCount} non-workspace)`));
  }

  // Collect versions
  if (!args.quiet) {
    console.log(chalk.dim('Collecting versions...'));
  }
  const { versions, allEntries } = collectVersions(packages);

  // Analyze
  if (!args.quiet) {
    console.log(chalk.dim('Analyzing versions...'));
  }
  const analysis = analyzeVersions(versions, rules);

  // Check outdated (optional)
  let outdated = null;
  if (args['check-outdated']) {
    if (!args.quiet) {
      console.log(chalk.dim('Checking for outdated packages...'));
    }
    outdated = checkOutdatedPackages(cwd);
  }

  // Build summary
  const summary = {
    totalEntries: allEntries.length,
    uniquePackages: Object.keys(versions).length,
    packagesScanned: packages.length,
    workspaces: packages.filter(p => p.isWorkspace).length,
    conflicts: Object.keys(analysis.conflicts).length,
    warnings: Object.keys(analysis.warnings).length,
    ruleViolations: Object.keys(analysis.ruleViolations).length,
    rulesConfigLoaded: loaded,
    rulesConfigPath: configPath
  };

  // Output
  const outputPath = join(cwd, args.output);

  if (args.json) {
    writeJsonOutput(outputPath, allEntries, analysis, summary);
    if (!args.quiet) {
      console.log(chalk.dim(`JSON output written to: ${outputPath.replace('.jsonl', '.json')}`));
    }
  } else {
    writeJsonlOutput(outputPath, allEntries, analysis, summary);
    if (!args.quiet) {
      console.log(chalk.dim(`JSONL output written to: ${outputPath}`));
    }
  }

  // Console output
  if (!args.quiet) {
    printConsoleOutput(versions, analysis, summary, outdated);
  }

  // Exit code based on conflicts/violations
  const hasErrors = summary.conflicts > 0 || summary.ruleViolations > 0;
  process.exit(hasErrors ? 1 : 0);
}

// Run
main().catch(err => {
  console.error(chalk.red(`Error: ${err.message}`));
  if (process.env.DEBUG) {
    console.error(err.stack);
  }
  process.exit(1);
});
