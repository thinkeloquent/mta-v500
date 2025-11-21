#!/usr/bin/env node

/**
 * Create Fastify App - Scaffolding CLI
 *
 * Usage:
 *   node tools/project-templates/fastify-apps-simple/bin/create-fastify-app.mjs <app-name>
 *   npm run create:fastify-app <app-name>
 *
 * Example:
 *   npm run create:fastify-app my-new-app
 *   → Creates fastify-apps/my-new-app/
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// Configuration
// =============================================================================

const TEMPLATE_DIR = resolve(__dirname, '../template');
const TARGET_BASE_DIR = resolve(__dirname, '../../../../fastify-apps');

// Placeholder patterns used in template files
const PLACEHOLDERS = {
  APP_NAME: '{{APP_NAME}}', // kebab-case: my-new-app
  APP_NAME_PASCAL: '{{APP_NAME_PASCAL}}', // PascalCase: MyNewApp
  APP_NAME_CAMEL: '{{APP_NAME_CAMEL}}', // camelCase: myNewApp
  APP_NAME_TITLE: '{{APP_NAME_TITLE}}', // Title Case: My New App
  APP_NAME_UPPER_SNAKE: '{{APP_NAME_UPPER_SNAKE}}', // UPPER_SNAKE: MY_NEW_APP
};

// =============================================================================
// Utilities
// =============================================================================

/**
 * Converts kebab-case to PascalCase
 * @param {string} str - kebab-case string
 * @returns {string} PascalCase string
 */
function toPascalCase(str) {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Converts kebab-case to camelCase
 * @param {string} str - kebab-case string
 * @returns {string} camelCase string
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Converts kebab-case to Title Case
 * @param {string} str - kebab-case string
 * @returns {string} Title Case string
 */
function toTitleCase(str) {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Converts kebab-case to UPPER_SNAKE_CASE
 * @param {string} str - kebab-case string
 * @returns {string} UPPER_SNAKE_CASE string
 */
function toUpperSnakeCase(str) {
  return str.replace(/-/g, '_').toUpperCase();
}

/**
 * Validates app name format (kebab-case)
 * @param {string} name - App name to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAppName(name) {
  if (!name) {
    return { valid: false, error: 'App name is required' };
  }

  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name) && !/^[a-z]$/.test(name)) {
    return {
      valid: false,
      error:
        'App name must be kebab-case (lowercase letters, numbers, and hyphens, starting with a letter)',
    };
  }

  if (name.includes('--')) {
    return { valid: false, error: 'App name cannot contain consecutive hyphens' };
  }

  return { valid: true };
}

/**
 * Replaces all placeholders in content
 * @param {string} content - File content
 * @param {string} appName - App name in kebab-case
 * @returns {string} Content with placeholders replaced
 */
function replacePlaceholders(content, appName) {
  return content
    .replace(new RegExp(PLACEHOLDERS.APP_NAME_PASCAL, 'g'), toPascalCase(appName))
    .replace(new RegExp(PLACEHOLDERS.APP_NAME_CAMEL, 'g'), toCamelCase(appName))
    .replace(new RegExp(PLACEHOLDERS.APP_NAME_TITLE, 'g'), toTitleCase(appName))
    .replace(new RegExp(PLACEHOLDERS.APP_NAME_UPPER_SNAKE, 'g'), toUpperSnakeCase(appName))
    .replace(new RegExp(PLACEHOLDERS.APP_NAME, 'g'), appName);
}

/**
 * Recursively copies template directory with placeholder replacement
 * @param {string} srcDir - Source directory
 * @param {string} destDir - Destination directory
 * @param {string} appName - App name for placeholder replacement
 */
function copyTemplate(srcDir, destDir, appName) {
  const entries = readdirSync(srcDir);

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const stat = statSync(srcPath);

    // Handle .tmpl extension (remove it in destination)
    let destEntry = entry;
    if (entry.endsWith('.tmpl')) {
      destEntry = entry.slice(0, -5);
    }

    // Replace placeholders in filename
    destEntry = replacePlaceholders(destEntry, appName);

    const destPath = join(destDir, destEntry);

    if (stat.isDirectory()) {
      // Skip node_modules and dist directories
      if (entry === 'node_modules' || entry === 'dist') {
        continue;
      }
      mkdirSync(destPath, { recursive: true });
      copyTemplate(srcPath, destPath, appName);
    } else {
      // Read file content
      const content = readFileSync(srcPath, 'utf-8');
      // Replace placeholders and write
      const processedContent = replacePlaceholders(content, appName);
      writeFileSync(destPath, processedContent);
      console.log(`  ✓ Created: ${relative(TARGET_BASE_DIR, destPath)}`);
    }
  }
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const appName = args[0];

  console.log('\n🚀 Create Fastify App\n');

  // Validate app name
  const validation = validateAppName(appName);
  if (!validation.valid) {
    console.error(`❌ Error: ${validation.error}\n`);
    console.log('Usage: npm run create:fastify-app <app-name>');
    console.log('Example: npm run create:fastify-app my-api\n');
    process.exit(1);
  }

  const targetDir = join(TARGET_BASE_DIR, appName);

  // Check if target directory already exists
  if (existsSync(targetDir)) {
    console.error(`❌ Error: Directory already exists: fastify-apps/${appName}\n`);
    process.exit(1);
  }

  // Check if template directory exists
  if (!existsSync(TEMPLATE_DIR)) {
    console.error(`❌ Error: Template directory not found: ${TEMPLATE_DIR}\n`);
    process.exit(1);
  }

  console.log(`📁 Creating new Fastify app: ${appName}`);
  console.log(`   Target: fastify-apps/${appName}/\n`);

  // Create target directory
  mkdirSync(targetDir, { recursive: true });

  // Copy template with placeholder replacement
  console.log('📝 Generating files:\n');
  copyTemplate(TEMPLATE_DIR, targetDir, appName);

  console.log('\n✅ App created successfully!\n');
  console.log('📋 Next steps:\n');
  console.log(`   1. cd fastify-apps/${appName}`);
  console.log('   2. pnpm install');
  console.log('   3. npm run app:dev\n');
  console.log('📖 See README.md in the new app directory for more details.\n');
}

main();
