import type { AppConfig, ConfigValidationResult, MtaPrismaConfig } from '../types/config.js';
/**
 * Load configuration from file or auto-discover apps
 */
export declare function loadConfig(configPath?: string): Promise<MtaPrismaConfig>;
/**
 * Validate configuration
 */
export declare function validateConfig(config: MtaPrismaConfig): ConfigValidationResult;
/**
 * Get apps in dependency order (topological sort)
 */
export declare function getAppsInOrder(config: MtaPrismaConfig): AppConfig[];
/**
 * Get app by name
 */
export declare function getApp(config: MtaPrismaConfig, name: string): AppConfig | undefined;
/**
 * Resolve paths relative to project root
 */
export declare function resolvePath(path: string, root?: string): string;
//# sourceMappingURL=config.d.ts.map