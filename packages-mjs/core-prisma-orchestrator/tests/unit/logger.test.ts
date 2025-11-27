import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../src/lib/logger.js';

describe('Logger Module', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test message'));
    });
  });

  describe('success', () => {
    it('should log success message with checkmark', () => {
      logger.success('Operation complete');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Operation complete'));
    });
  });

  describe('error', () => {
    it('should log error message with cross', () => {
      logger.error('Error occurred');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('✗'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error occurred'));
    });
  });

  describe('warn', () => {
    it('should log warning message with icon', () => {
      logger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠'));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
    });
  });

  describe('step', () => {
    it('should log step progress', () => {
      logger.step(2, 5, 'Processing item');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[2/5]'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Processing item'));
    });
  });

  describe('header', () => {
    it('should log header with separator', () => {
      logger.header('Section Title');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Section Title'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('='));
    });
  });

  describe('section', () => {
    it('should log section with arrow', () => {
      logger.section('Subsection');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('▶'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Subsection'));
    });
  });

  describe('dim', () => {
    it('should log dimmed message', () => {
      logger.dim('Dimmed text');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Dimmed text'));
    });
  });
});
