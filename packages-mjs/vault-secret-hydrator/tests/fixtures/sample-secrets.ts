/**
 * @file Test fixtures for vault secret parser tests
 */

/**
 * Simple secret with no FILE_ keys
 */
export const SIMPLE_SECRET = `
API_KEY=abc123
DATABASE_HOST=localhost
DATABASE_PORT=5432
REDIS_URL=redis://localhost:6379
`.trim();

/**
 * Secret with lowercase keys (should be ignored)
 */
export const MIXED_CASE_SECRET = `
API_KEY=abc123
lowercase_key=should_be_ignored
MixedCase=also_ignored
DATABASE_HOST=localhost
`.trim();

/**
 * Secret with a single FILE_ entry
 */
export const SINGLE_FILE_SECRET = `
API_KEY=abc123
FILE_CONFIG=REFUQUJBU0VfVVJMPXBvc3RncmVzOi8vbG9jYWxob3N0OjU0MzIKREFUQUJBU0VfTkFNRT10ZXN0ZGI=
SERVER_PORT=3000
`.trim();

/**
 * The decoded content of FILE_CONFIG above
 * DATABASE_URL=postgres://localhost:5432
 * DATABASE_NAME=testdb
 */
export const DECODED_FILE_CONFIG = `DATABASE_URL=postgres://localhost:5432
DATABASE_NAME=testdb`;

/**
 * Secret with multiple FILE_ entries
 */
export const MULTIPLE_FILES_SECRET = `
ENV=production
FILE_DB=REFUQUJBU0VfVVNFUj1wb3N0Z3Jlcw==
FILE_REDIS=UkVESVNfSE9TVD1sb2NhbGhvc3Q=
API_VERSION=v1
`.trim();

/**
 * Decoded FILE_DB: DATABASE_USER=postgres
 */
export const DECODED_FILE_DB = 'DATABASE_USER=postgres';

/**
 * Decoded FILE_REDIS: REDIS_HOST=localhost
 */
export const DECODED_FILE_REDIS = 'REDIS_HOST=localhost';

/**
 * Secret with nested FILE_ entries (recursive)
 */
export const NESTED_FILE_SECRET = `
LEVEL=1
FILE_LEVEL2=TEVWRUY9MgpGSUxFX0xFVkVMMyxURVZFTD0zCkZJTkFMPXZhbHVl
`.trim();

/**
 * Decoded FILE_LEVEL2:
 * LEVEL=2
 * FILE_LEVEL3=TEVWRUY9MwpGSU5BTD12YWx1ZQ==
 *
 * Decoded FILE_LEVEL3:
 * LEVEL=3
 * FINAL=value
 */

/**
 * Secret with invalid base64
 */
export const INVALID_BASE64_SECRET = `
API_KEY=abc123
FILE_BAD=not-valid-base64!!!
SERVER_PORT=3000
`.trim();

/**
 * Empty secret
 */
export const EMPTY_SECRET = '';

/**
 * Secret with only whitespace
 */
export const WHITESPACE_SECRET = '   \n  \t  \n  ';

/**
 * Secret with duplicate keys (after merging)
 * The duplicate comes from two FILE_ entries producing the same flattened key:
 * - FILE_A contains B_C=first, creating FILE_A_B_C=first
 * - FILE_A_B contains C=second, creating FILE_A_B_C=second
 * Both create the same key FILE_A_B_C, causing a conflict
 */
export const DUPLICATE_KEY_SECRET = `
FILE_A=Ql9DPWZpcnN0
FILE_A_B=Qz1zZWNvbmQ=
`.trim();

/**
 * Decoded FILE_A: B_C=first (creates FILE_A_B_C=first)
 * Decoded FILE_A_B: C=second (creates FILE_A_B_C=second)
 * Conflict: FILE_A_B_C appears twice
 */

/**
 * Secret with Windows line endings
 */
export const WINDOWS_LINE_ENDINGS_SECRET =
  'API_KEY=abc123\r\nDATABASE_HOST=localhost\r\nSERVER_PORT=3000';

/**
 * Expected results for simple secret
 */
export const SIMPLE_SECRET_EXPECTED = {
  API_KEY: 'abc123',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  REDIS_URL: 'redis://localhost:6379',
};

/**
 * Expected results for single file secret
 */
export const SINGLE_FILE_EXPECTED_PROPERTIES = {
  API_KEY: 'abc123',
  SERVER_PORT: '3000',
  FILE_CONFIG_DATABASE_URL: 'postgres://localhost:5432',
  FILE_CONFIG_DATABASE_NAME: 'testdb',
};

/**
 * Expected results for multiple files secret
 */
export const MULTIPLE_FILES_EXPECTED_PROPERTIES = {
  ENV: 'production',
  API_VERSION: 'v1',
  FILE_DB_DATABASE_USER: 'postgres',
  FILE_REDIS_REDIS_HOST: 'localhost',
};
