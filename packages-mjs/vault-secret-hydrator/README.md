# @thinkeloquent/vault-secret-hydrator

TypeScript library for parsing Vault secrets with file-backed secret support for Node.js v22+.

## Features

- ✅ Parse plaintext `KEY=VALUE` format secrets
- ✅ Automatic base64 decoding for `FILE_` prefixed keys
- ✅ Recursive parsing of nested file contents
- ✅ Property flattening with `FILE_KEY_nestedKey` pattern
- ✅ Configurable strict/loose mode
- ✅ Duplicate key detection and handling strategies
- ✅ Type-safe with TypeScript
- ✅ Zero dependencies (except `properties-parser`)
- ✅ Comprehensive test coverage (>90%)

## Installation

```bash
npm install @thinkeloquent/vault-secret-hydrator
```

## Quick Start

```typescript
import { createVaultSecretParser } from '@thinkeloquent/vault-secret-hydrator';

const parser = createVaultSecretParser();

const secret = `
API_KEY=abc123
DATABASE_HOST=localhost
FILE_CONFIG=REFUQUJBU0VfVVJMPXBvc3RncmVzOi8vbG9jYWxob3N0OjU0MzIKREFUQUJBU0VfTkFNRT10ZXN0ZGI=
`;

const result = parser.parse(secret);

console.log(result.properties);
// {
//   API_KEY: 'abc123',
//   DATABASE_HOST: 'localhost',
//   FILE_CONFIG_DATABASE_URL: 'postgres://localhost:5432',
//   FILE_CONFIG_DATABASE_NAME: 'testdb'
// }
```

## How It Works

### 1. Simple Properties

Keys in `UPPERCASE` format are parsed as regular properties:

```typescript
const secret = `
API_KEY=abc123
DATABASE_HOST=localhost
DATABASE_PORT=5432
`;

const result = parser.parse(secret);
// result.properties = {
//   API_KEY: 'abc123',
//   DATABASE_HOST: 'localhost',
//   DATABASE_PORT: '5432'
// }
```

### 2. File-Backed Secrets

Keys starting with `FILE_` contain base64-encoded file content:

```typescript
const secret = `
API_KEY=abc123
FILE_CONFIG=REFUQUJBU0VfVVNFUj1wb3N0Z3Jlcw==
`;

const result = parser.parse(secret);
// Decodes FILE_CONFIG and parses its content recursively
```

### 3. Property Flattening

Nested properties from `FILE_` entries are flattened into the root `properties` object:

```
FILE_CONFIG contains:
  DATABASE_USER=postgres
  DATABASE_PASSWORD=secret

Result:
  properties = {
    API_KEY: 'abc123',
    FILE_CONFIG_DATABASE_USER: 'postgres',
    FILE_CONFIG_DATABASE_PASSWORD: 'secret'
  }
```

### 4. Recursive Parsing

`FILE_` entries can contain nested `FILE_` entries, parsed recursively:

```typescript
const secret = `
LEVEL=1
FILE_LEVEL2=TEVWRUY9MgpGSUxFX0xFVkVMMyxURVZFTD0zCkZJTkFMPXZhbHVl
`;

// FILE_LEVEL2 decodes to:
// LEVEL=2
// FILE_LEVEL3=TEVWRUY9MwpGSU5BTD12YWx1ZQ==

// FILE_LEVEL3 decodes to:
// LEVEL=3
// FINAL=value

const result = parser.parse(secret);
// All levels are flattened into properties
```

## API Reference

### `createVaultSecretParser(options?)`

Factory function to create a parser instance.

**Parameters:**
- `options` (optional): Parser configuration

**Returns:** `VaultSecretParser` instance

### Parser Options

```typescript
interface ParserOptions {
  strict?: boolean;                          // Default: true
  duplicateKeyStrategy?: 'error' | 'override' | 'skip';  // Default: 'error'
  ignoreNonUppercase?: boolean;              // Default: true
}
```

#### `strict` (default: `true`)

- `true`: Throw errors on invalid base64, parsing failures, etc.
- `false`: Log warnings and skip invalid entries

#### `duplicateKeyStrategy` (default: `'error'`)

How to handle duplicate keys after merging nested properties:
- `'error'`: Throw `DuplicateKeyError`
- `'override'`: Use the new value
- `'skip'`: Keep the existing value

#### `ignoreNonUppercase` (default: `true`)

- `true`: Only process uppercase keys
- `false`: Process all keys

### VaultSecretParser Methods

#### `parse(input: string | Buffer): ParsedSecret`

Parse a vault secret string or buffer.

**Parameters:**
- `input`: Plaintext secret content (string or Buffer)

**Returns:** `ParsedSecret` object with `properties` and `files`

**Throws:**
- `EmptyInputError`: Input is empty or null
- `Base64DecodingError`: Invalid base64 in `FILE_` value
- `DuplicateKeyError`: Duplicate keys detected (strict mode only)
- `ParsingError`: Failed to parse KEY=VALUE format

#### `getProperties(): Record<string, string>`

Get all properties (including flattened `FILE_` properties).

**Returns:** Object with all property key-value pairs

#### `getFiles(): Record<string, FileEntry>`

Get all file entries.

**Returns:** Object with file entries by key

#### `toJSON(): ParsedSecret`

Serialize to JSON (useful for debugging/testing).

**Returns:** `ParsedSecret` object

#### `getOptions(): Required<ParserOptions>`

Get the current parser options.

**Returns:** Current parser configuration

## Types

### `ParsedSecret`

```typescript
interface ParsedSecret {
  properties: Record<string, string>;
  files: Record<string, FileEntry>;
}
```

### `FileEntry`

```typescript
interface FileEntry {
  key: string;           // e.g., "FILE_CONFIG"
  decoded: string;       // Decoded plaintext
  parser: ParsedSecret;  // Recursive parser result
}
```

## Usage Examples

### Basic Usage

```typescript
import { createVaultSecretParser } from '@thinkeloquent/vault-secret-hydrator';

const parser = createVaultSecretParser();
const result = parser.parse(vaultSecretString);

console.log(result.properties);
console.log(result.files);
```

### With Options

```typescript
const parser = createVaultSecretParser({
  strict: false,                    // Don't throw on errors
  duplicateKeyStrategy: 'override', // Override duplicate keys
  ignoreNonUppercase: true          // Ignore lowercase keys
});
```

### Accessing File Metadata

```typescript
const result = parser.parse(secret);

for (const [key, fileEntry] of Object.entries(result.files)) {
  console.log(`File: ${fileEntry.key}`);
  console.log(`Decoded content: ${fileEntry.decoded}`);
  console.log(`Nested properties:`, fileEntry.parser.properties);
}
```

### Error Handling

```typescript
import {
  createVaultSecretParser,
  Base64DecodingError,
  DuplicateKeyError
} from '@thinkeloquent/vault-secret-hydrator';

const parser = createVaultSecretParser({ strict: true });

try {
  const result = parser.parse(secret);
} catch (error) {
  if (error instanceof Base64DecodingError) {
    console.error(`Failed to decode ${error.key}: ${error.message}`);
  } else if (error instanceof DuplicateKeyError) {
    console.error(`Duplicate key ${error.key}: ${error.message}`);
  }
}
```

### Loose Mode (Skip Errors)

```typescript
const parser = createVaultSecretParser({ strict: false });

// Invalid entries will be logged and skipped
const result = parser.parse(secretWithErrors);
```

### Express/Fastify Integration

```typescript
import { createVaultSecretParser } from '@thinkeloquent/vault-secret-hydrator';
import { readFileSync } from 'fs';

// Load vault secret from file
const vaultSecret = readFileSync('/run/secrets/vault', 'utf-8');

// Parse the secret
const parser = createVaultSecretParser();
const result = parser.parse(vaultSecret);

// Use properties in your application
const dbConfig = {
  host: result.properties.DATABASE_HOST,
  port: parseInt(result.properties.DATABASE_PORT, 10),
  user: result.properties.DATABASE_USER,
  password: result.properties.DATABASE_PASSWORD,
};
```

## Input Format

### KEY=VALUE Format

```
API_KEY=abc123
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

### Rules

1. Only uppercase keys are processed (by default)
2. Keys starting with `FILE_` are treated as base64-encoded files
3. Supports both `\n` and `\r\n` line endings
4. Supports values with `=` characters
5. Non-uppercase keys are ignored (by default)

### FILE_ Format

```
FILE_CONFIG=<base64-encoded-content>
```

The base64 content is decoded and parsed recursively using the same rules.

## Error Types

### `VaultSecretError`

Base error class for all parser errors.

### `EmptyInputError`

Thrown when input is empty or null.

### `Base64DecodingError`

Thrown when base64 decoding fails for a `FILE_` key.

**Properties:**
- `key`: The key name that failed
- `value`: The invalid base64 value

### `DuplicateKeyError`

Thrown when duplicate keys are detected after merging (strict mode only).

**Properties:**
- `key`: The duplicate key name
- `existingValue`: The original value
- `newValue`: The conflicting value

### `ParsingError`

Thrown when properties parsing fails.

### `InvalidOptionsError`

Thrown when invalid options are provided.

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Test with Coverage

```bash
npm run test:coverage
```

### Type Check

```bash
npm run typecheck
```

## Requirements

- Node.js >= 22.0.0
- npm >= 9.0.0

## Dependencies

- `properties-parser`: ^0.3.1 (for KEY=VALUE parsing)

## License

MIT

## Author

ThinkEloquent

## Related Projects

- [@thinkeloquent/core-exceptions](https://www.npmjs.com/package/@thinkeloquent/core-exceptions) - Error handling utilities
- [@thinkeloquent/core-configure](https://www.npmjs.com/package/@thinkeloquent/core-configure) - Configuration management
