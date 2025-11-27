import { describe, expect, it } from 'vitest';
import { defaultConfig, devConfig, minimalConfig, prodConfig } from './config.js';
import type { ProcessExceptionOptions } from './types.js';

describe('Process Exception Configuration', () => {
  describe('Default Configuration', () => {
    it('should have all features enabled', () => {
      expect(defaultConfig.enableErrorHandler).toBe(true);
      expect(defaultConfig.enableGracefulShutdown).toBe(true);
      expect(defaultConfig.enableProcessHandlers).toBe(true);
      expect(defaultConfig.exposeGracefulShutdown).toBe(true);
    });

    it('should have reasonable shutdown timeout', () => {
      expect(defaultConfig.shutdownTimeout).toBe(10000);
    });

    it('should have all feature flags enabled', () => {
      expect(defaultConfig.features?.validationErrors).toBe(true);
      expect(defaultConfig.features?.handleSigInt).toBe(true);
      expect(defaultConfig.features?.handleSigTerm).toBe(true);
      expect(defaultConfig.features?.handleUnhandledRejection).toBe(true);
      expect(defaultConfig.features?.handleUncaughtException).toBe(true);
    });

    it('should be a valid ProcessExceptionOptions object', () => {
      const config: ProcessExceptionOptions = defaultConfig;
      expect(config).toBeDefined();
    });
  });

  describe('Development Configuration', () => {
    it('should have all features enabled', () => {
      expect(devConfig.enableErrorHandler).toBe(true);
      expect(devConfig.enableGracefulShutdown).toBe(true);
      expect(devConfig.enableProcessHandlers).toBe(true);
    });

    it('should have shorter timeout for faster iteration', () => {
      expect(devConfig.shutdownTimeout).toBe(5000);
      expect(devConfig.shutdownTimeout).toBeLessThan(defaultConfig.shutdownTimeout ?? 0);
    });

    it('should have all feature flags enabled', () => {
      expect(devConfig.features?.validationErrors).toBe(true);
      expect(devConfig.features?.handleSigInt).toBe(true);
      expect(devConfig.features?.handleSigTerm).toBe(true);
      expect(devConfig.features?.handleUnhandledRejection).toBe(true);
      expect(devConfig.features?.handleUncaughtException).toBe(true);
    });
  });

  describe('Production Configuration', () => {
    it('should have all features enabled', () => {
      expect(prodConfig.enableErrorHandler).toBe(true);
      expect(prodConfig.enableGracefulShutdown).toBe(true);
      expect(prodConfig.enableProcessHandlers).toBe(true);
    });

    it('should have longer timeout for proper cleanup', () => {
      expect(prodConfig.shutdownTimeout).toBe(30000);
      expect(prodConfig.shutdownTimeout).toBeGreaterThan(defaultConfig.shutdownTimeout ?? 0);
      expect(prodConfig.shutdownTimeout).toBeGreaterThan(devConfig.shutdownTimeout ?? 0);
    });

    it('should have all feature flags enabled for maximum reliability', () => {
      expect(prodConfig.features?.validationErrors).toBe(true);
      expect(prodConfig.features?.handleSigInt).toBe(true);
      expect(prodConfig.features?.handleSigTerm).toBe(true);
      expect(prodConfig.features?.handleUnhandledRejection).toBe(true);
      expect(prodConfig.features?.handleUncaughtException).toBe(true);
    });
  });

  describe('Minimal Configuration', () => {
    it('should have only essential features enabled', () => {
      expect(minimalConfig.enableErrorHandler).toBe(true);
      expect(minimalConfig.enableGracefulShutdown).toBe(false);
      expect(minimalConfig.enableProcessHandlers).toBe(false);
      expect(minimalConfig.exposeGracefulShutdown).toBe(false);
    });

    it('should have short timeout', () => {
      expect(minimalConfig.shutdownTimeout).toBe(5000);
    });

    it('should have minimal feature flags', () => {
      expect(minimalConfig.features?.validationErrors).toBe(true);
      expect(minimalConfig.features?.handleSigInt).toBe(false);
      expect(minimalConfig.features?.handleSigTerm).toBe(false);
      expect(minimalConfig.features?.handleUnhandledRejection).toBe(false);
      expect(minimalConfig.features?.handleUncaughtException).toBe(false);
    });
  });

  describe('Configuration Comparison', () => {
    it('should have increasing timeouts from dev to prod', () => {
      expect(devConfig.shutdownTimeout).toBeLessThan(defaultConfig.shutdownTimeout ?? 0);
      expect(defaultConfig.shutdownTimeout).toBeLessThan(prodConfig.shutdownTimeout ?? 0);
    });

    it('should all be compatible with ProcessExceptionOptions type', () => {
      const configs: ProcessExceptionOptions[] = [
        defaultConfig,
        devConfig,
        prodConfig,
        minimalConfig,
      ];

      configs.forEach((config) => {
        expect(config).toBeDefined();
        expect(typeof config.enableErrorHandler).toBe('boolean');
        expect(typeof config.enableGracefulShutdown).toBe('boolean');
        expect(typeof config.enableProcessHandlers).toBe('boolean');
      });
    });
  });

  describe('Configuration Merging', () => {
    it('should allow partial overrides of default config', () => {
      const customConfig: ProcessExceptionOptions = {
        ...defaultConfig,
        shutdownTimeout: 15000,
      };

      expect(customConfig.shutdownTimeout).toBe(15000);
      expect(customConfig.enableErrorHandler).toBe(true);
      expect(customConfig.enableGracefulShutdown).toBe(true);
    });

    it('should allow feature flag overrides', () => {
      const customConfig: ProcessExceptionOptions = {
        ...defaultConfig,
        features: {
          ...defaultConfig.features,
          handleSigInt: false,
        },
      };

      expect(customConfig.features?.handleSigInt).toBe(false);
      expect(customConfig.features?.handleSigTerm).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types', () => {
      const validConfig: ProcessExceptionOptions = {
        enableErrorHandler: true,
        enableGracefulShutdown: true,
        enableProcessHandlers: true,
        shutdownTimeout: 10000,
      };

      expect(validConfig).toBeDefined();
    });

    it('should have optional properties', () => {
      const minConfig: ProcessExceptionOptions = {};
      expect(minConfig).toBeDefined();
    });
  });
});
