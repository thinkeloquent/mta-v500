import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Load configuration from ./common/config directory
 * @param env - Environment name (dev, staging, prod)
 * @returns Combined configuration object
 */
export function loadConfig(env: string = 'dev'): any {
  const commonPath = join(process.cwd(), 'common', 'config');

  try {
    // Load app registry
    const appRegistry = JSON.parse(readFileSync(join(commonPath, 'app-registry.json'), 'utf-8'));

    // Load environment-specific config
    const envConfig = JSON.parse(
      readFileSync(join(commonPath, 'environments', `${env}.json`), 'utf-8'),
    );

    return { ...appRegistry, ...envConfig };
  } catch (error) {
    console.error(`Failed to load config for environment: ${env}`, error);
    throw error;
  }
}

/**
 * Load a specific config file from ./common/config
 * @param filename - Config filename (e.g., 'database.yaml', 'redis.yaml')
 * @returns Config file contents
 */
export function loadConfigFile(filename: string): string {
  const commonPath = join(process.cwd(), 'common', 'config');

  try {
    return readFileSync(join(commonPath, filename), 'utf-8');
  } catch (error) {
    console.error(`Failed to load config file: ${filename}`, error);
    throw error;
  }
}

export default { loadConfig, loadConfigFile };
