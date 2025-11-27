import { describe, expect, it } from 'vitest';
import { defaultConfig, devConfig, prodConfig } from './config.js';

describe('Header Request Enhancements Config', () => {
  describe('defaultConfig', () => {
    it('should have sensible default values', () => {
      expect(defaultConfig.rateLimitMax).toBe(100);
      expect(defaultConfig.rateLimitTimeWindow).toBe('1 minute');
      expect(defaultConfig.corsUseOrigin).toBe(false);
      expect(defaultConfig.corsUseAnyHost).toBe(false);
    });

    it('should have all plugins enabled by default', () => {
      expect(defaultConfig.plugins?.sensible).toBe(true);
      expect(defaultConfig.plugins?.etag).toBe(true);
      expect(defaultConfig.plugins?.helmet).toBe(true);
      expect(defaultConfig.plugins?.rateLimit).toBe(true);
      expect(defaultConfig.plugins?.cors).toBe(true);
      expect(defaultConfig.plugins?.compress).toBe(true);
      expect(defaultConfig.plugins?.formbody).toBe(true);
      expect(defaultConfig.plugins?.multipart).toBe(true);
    });
  });

  describe('devConfig', () => {
    it('should have permissive rate limiting for development', () => {
      expect(devConfig.rateLimitMax).toBe(1000);
      expect(devConfig.rateLimitTimeWindow).toBe('1 minute');
    });

    it('should use permissive CORS for development', () => {
      expect(devConfig.corsUseAnyHost).toBe(true);
    });

    it('should disable security-heavy plugins for easier debugging', () => {
      expect(devConfig.plugins?.helmet).toBe(false);
      expect(devConfig.plugins?.rateLimit).toBe(false);
      expect(devConfig.plugins?.compress).toBe(false);
    });

    it('should keep essential plugins enabled', () => {
      expect(devConfig.plugins?.sensible).toBe(true);
      expect(devConfig.plugins?.cors).toBe(true);
      expect(devConfig.plugins?.formbody).toBe(true);
      expect(devConfig.plugins?.multipart).toBe(true);
    });
  });

  describe('prodConfig', () => {
    it('should have strict rate limiting for production', () => {
      expect(prodConfig.rateLimitMax).toBe(50);
      expect(prodConfig.rateLimitTimeWindow).toBe('1 minute');
    });

    it('should use origin-based CORS for production', () => {
      expect(prodConfig.corsUseOrigin).toBe(true);
      expect(prodConfig.corsUseAnyHost).toBe(false);
    });

    it('should have all security plugins enabled', () => {
      expect(prodConfig.plugins?.helmet).toBe(true);
      expect(prodConfig.plugins?.rateLimit).toBe(true);
      expect(prodConfig.plugins?.compress).toBe(true);
    });

    it('should have all plugins enabled', () => {
      expect(prodConfig.plugins?.sensible).toBe(true);
      expect(prodConfig.plugins?.etag).toBe(true);
      expect(prodConfig.plugins?.cors).toBe(true);
      expect(prodConfig.plugins?.formbody).toBe(true);
      expect(prodConfig.plugins?.multipart).toBe(true);
    });
  });

  describe('Config Comparison', () => {
    it('should have more strict rate limiting in prod than dev', () => {
      expect(prodConfig.rateLimitMax).toBeLessThan(devConfig.rateLimitMax ?? 0);
    });

    it('should have more strict rate limiting in prod than default', () => {
      expect(prodConfig.rateLimitMax).toBeLessThan(defaultConfig.rateLimitMax ?? 0);
    });

    it('should have more permissive rate limiting in dev than default', () => {
      expect(devConfig.rateLimitMax).toBeGreaterThan(defaultConfig.rateLimitMax ?? 0);
    });

    it('should use different CORS strategies', () => {
      expect(defaultConfig.corsUseAnyHost).toBe(false);
      expect(devConfig.corsUseAnyHost).toBe(true);
      expect(prodConfig.corsUseOrigin).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should have rate limit values as numbers', () => {
      expect(typeof defaultConfig.rateLimitMax).toBe('number');
      expect(typeof devConfig.rateLimitMax).toBe('number');
      expect(typeof prodConfig.rateLimitMax).toBe('number');
    });

    it('should have rate limit time windows as strings', () => {
      expect(typeof defaultConfig.rateLimitTimeWindow).toBe('string');
      expect(typeof devConfig.rateLimitTimeWindow).toBe('string');
      expect(typeof prodConfig.rateLimitTimeWindow).toBe('string');
    });

    it('should have plugin configurations as objects', () => {
      expect(typeof defaultConfig.plugins).toBe('object');
      expect(typeof devConfig.plugins).toBe('object');
      expect(typeof prodConfig.plugins).toBe('object');
    });
  });
});
