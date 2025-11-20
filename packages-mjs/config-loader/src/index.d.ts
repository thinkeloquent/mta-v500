/**
 * Load configuration from ./common/config directory
 * @param env - Environment name (dev, staging, prod)
 * @returns Combined configuration object
 */
export declare function loadConfig(env?: string): any;
/**
 * Load a specific config file from ./common/config
 * @param filename - Config filename (e.g., 'database.yaml', 'redis.yaml')
 * @returns Config file contents
 */
export declare function loadConfigFile(filename: string): string;
declare const _default: {
    loadConfig: typeof loadConfig;
    loadConfigFile: typeof loadConfigFile;
};
export default _default;
//# sourceMappingURL=index.d.ts.map