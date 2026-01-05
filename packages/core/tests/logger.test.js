/**
 * Tests for @pagemd/core/logger
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLogger, setLogLevel, getLogLevel } from '../src/logger.js';
import { isColorsEnabled, colorLevel, colorResult, colors } from '../src/colors.js';

describe('logger', () => {
  // Store original console methods
  let originalConsoleLog;
  let originalConsoleError;
  let consoleLogMock;
  let consoleErrorMock;

  beforeEach(() => {
    // Save originals
    originalConsoleLog = console.log;
    originalConsoleError = console.error;

    // Mock console methods
    consoleLogMock = vi.fn();
    consoleErrorMock = vi.fn();
    console.log = consoleLogMock;
    console.error = consoleErrorMock;

    // Reset to TRACE level for tests
    setLogLevel('TRACE');
  });

  afterEach(() => {
    // Restore originals
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('createLogger', () => {
    it('creates logger for valid module', () => {
      const logger = createLogger('cli');
      expect(logger).toBeDefined();
      expect(logger.trace).toBeTypeOf('function');
      expect(logger.debug).toBeTypeOf('function');
      expect(logger.info).toBeTypeOf('function');
      expect(logger.warn).toBeTypeOf('function');
      expect(logger.error).toBeTypeOf('function');
      expect(logger.fatal).toBeTypeOf('function');
    });

    it('throws error for invalid module', () => {
      expect(() => createLogger('invalid-module')).toThrow(/Invalid module/);
    });

    it('accepts all valid module names', () => {
      const validModules = [
        'cli',
        'profiles',
        'layout',
        'parser',
        'validation',
        'renderer.web',
        'renderer.pdf',
        'exporter',
        'io',
        'assets',
        'logging'
      ];

      validModules.forEach(module => {
        expect(() => createLogger(module)).not.toThrow();
      });
    });
  });

  describe('setLogLevel', () => {
    it('sets valid log levels', () => {
      const levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'];

      levels.forEach(level => {
        setLogLevel(level);
        expect(getLogLevel()).toBe(level);
      });
    });

    it('handles lowercase level names', () => {
      setLogLevel('info');
      expect(getLogLevel()).toBe('INFO');

      setLogLevel('debug');
      expect(getLogLevel()).toBe('DEBUG');
    });

    it('throws error for invalid level', () => {
      expect(() => setLogLevel('INVALID')).toThrow(/Invalid log level/);
    });
  });

  describe('getLogLevel', () => {
    it('returns current log level', () => {
      setLogLevel('INFO');
      expect(getLogLevel()).toBe('INFO');

      setLogLevel('ERROR');
      expect(getLogLevel()).toBe('ERROR');
    });
  });

  describe('log methods', () => {
    it('trace() logs with correct format', () => {
      const logger = createLogger('cli');
      logger.trace('section1', 'success', 'Test message');

      expect(consoleLogMock).toHaveBeenCalledOnce();
      const logOutput = consoleLogMock.mock.calls[0][0];

      expect(logOutput).toContain('level=TRACE');
      expect(logOutput).toContain('module=cli');
      expect(logOutput).toContain('section=section1');
      expect(logOutput).toContain('result=success');
      expect(logOutput).toContain('msg="Test message"');
    });

    it('debug() logs with correct format', () => {
      const logger = createLogger('parser');
      logger.debug('tokenizer', 'in-progress', 'Parsing tokens');

      expect(consoleLogMock).toHaveBeenCalledOnce();
      const logOutput = consoleLogMock.mock.calls[0][0];

      expect(logOutput).toContain('level=DEBUG');
      expect(logOutput).toContain('module=parser');
      expect(logOutput).toContain('section=tokenizer');
      expect(logOutput).toContain('result=in-progress');
    });

    it('info() logs with correct format', () => {
      const logger = createLogger('renderer.pdf');
      logger.info('pdf-gen', 'success', 'PDF generated');

      expect(consoleLogMock).toHaveBeenCalledOnce();
      const logOutput = consoleLogMock.mock.calls[0][0];

      expect(logOutput).toContain('level=INFO');
      expect(logOutput).toContain('module=renderer.pdf');
    });

    it('warn() logs with correct format', () => {
      const logger = createLogger('validation');
      logger.warn('schema', 'partial', 'Missing optional field');

      expect(consoleLogMock).toHaveBeenCalledOnce();
      const logOutput = consoleLogMock.mock.calls[0][0];

      expect(logOutput).toContain('level=WARN');
      expect(logOutput).toContain('module=validation');
    });

    it('error() logs to stderr', () => {
      const logger = createLogger('io');
      logger.error('file-read', 'failure', 'File not found');

      expect(consoleErrorMock).toHaveBeenCalledOnce();
      expect(consoleLogMock).not.toHaveBeenCalled();

      const logOutput = consoleErrorMock.mock.calls[0][0];
      expect(logOutput).toContain('level=ERROR');
      expect(logOutput).toContain('module=io');
    });

    it('fatal() logs to stderr', () => {
      const logger = createLogger('cli');
      logger.fatal('init', 'failure', 'Critical error');

      expect(consoleErrorMock).toHaveBeenCalledOnce();
      expect(consoleLogMock).not.toHaveBeenCalled();

      const logOutput = consoleErrorMock.mock.calls[0][0];
      expect(logOutput).toContain('level=FATAL');
    });

    it('includes structured data when provided', () => {
      const logger = createLogger('profiles');
      const data = { profileId: 'test', count: 5 };
      logger.info('load', 'success', 'Profile loaded', data);

      expect(consoleLogMock).toHaveBeenCalledOnce();
      const logOutput = consoleLogMock.mock.calls[0][0];

      expect(logOutput).toContain('data=');
      expect(logOutput).toContain('"profileId":"test"');
      expect(logOutput).toContain('"count":5');
    });

    it('escapes double quotes in messages', () => {
      const logger = createLogger('cli');
      logger.info('test', 'success', 'Message with "quotes" inside');

      expect(consoleLogMock).toHaveBeenCalledOnce();
      const logOutput = consoleLogMock.mock.calls[0][0];

      expect(logOutput).toContain('msg="Message with \\"quotes\\" inside"');
    });

    it('includes ISO timestamp', () => {
      const logger = createLogger('cli');
      logger.info('test', 'success', 'Test message');

      expect(consoleLogMock).toHaveBeenCalledOnce();
      const logOutput = consoleLogMock.mock.calls[0][0];

      // Check for ISO timestamp format (starts with YYYY-MM-DD)
      expect(logOutput).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('log level filtering', () => {
    it('respects log level threshold', () => {
      const logger = createLogger('cli');

      setLogLevel('ERROR');

      // These should not log
      logger.trace('test', 'success', 'Trace message');
      logger.debug('test', 'success', 'Debug message');
      logger.info('test', 'success', 'Info message');
      logger.warn('test', 'success', 'Warn message');

      expect(consoleLogMock).not.toHaveBeenCalled();
      expect(consoleErrorMock).not.toHaveBeenCalled();

      // These should log
      logger.error('test', 'failure', 'Error message');
      expect(consoleErrorMock).toHaveBeenCalledOnce();

      logger.fatal('test', 'failure', 'Fatal message');
      expect(consoleErrorMock).toHaveBeenCalledTimes(2);
    });

    it('OFF level suppresses all logs', () => {
      const logger = createLogger('cli');
      setLogLevel('OFF');

      logger.trace('test', 'success', 'Trace');
      logger.debug('test', 'success', 'Debug');
      logger.info('test', 'success', 'Info');
      logger.warn('test', 'success', 'Warn');
      logger.error('test', 'failure', 'Error');
      logger.fatal('test', 'failure', 'Fatal');

      expect(consoleLogMock).not.toHaveBeenCalled();
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('TRACE level logs everything', () => {
      const logger = createLogger('cli');
      setLogLevel('TRACE');

      logger.trace('test', 'success', 'Trace');
      logger.debug('test', 'success', 'Debug');
      logger.info('test', 'success', 'Info');
      logger.warn('test', 'success', 'Warn');

      // 4 stdout logs
      expect(consoleLogMock).toHaveBeenCalledTimes(4);

      logger.error('test', 'failure', 'Error');
      logger.fatal('test', 'failure', 'Fatal');

      // 2 stderr logs
      expect(consoleErrorMock).toHaveBeenCalledTimes(2);
    });

    it('INFO level filters trace and debug', () => {
      const logger = createLogger('cli');
      setLogLevel('INFO');

      logger.trace('test', 'success', 'Trace');
      logger.debug('test', 'success', 'Debug');

      expect(consoleLogMock).not.toHaveBeenCalled();

      logger.info('test', 'success', 'Info');
      expect(consoleLogMock).toHaveBeenCalledOnce();
    });
  });

  describe('multiple loggers', () => {
    it('different modules can log independently', () => {
      const logger1 = createLogger('cli');
      const logger2 = createLogger('parser');

      logger1.info('test1', 'success', 'CLI message');
      logger2.info('test2', 'success', 'Parser message');

      expect(consoleLogMock).toHaveBeenCalledTimes(2);

      const log1 = consoleLogMock.mock.calls[0][0];
      const log2 = consoleLogMock.mock.calls[1][0];

      expect(log1).toContain('module=cli');
      expect(log2).toContain('module=parser');
    });

    it('all loggers share same log level', () => {
      const logger1 = createLogger('cli');
      const logger2 = createLogger('parser');

      setLogLevel('ERROR');

      logger1.info('test', 'success', 'Should not log');
      logger2.debug('test', 'success', 'Should not log');

      expect(consoleLogMock).not.toHaveBeenCalled();

      logger1.error('test', 'failure', 'Should log');
      logger2.error('test', 'failure', 'Should log');

      expect(consoleErrorMock).toHaveBeenCalledTimes(2);
    });
  });
});

describe('colors', () => {
  let originalEnv;
  let originalIsTTY;

  beforeEach(() => {
    // Save original env and TTY state
    originalEnv = process.env.PAGEMD_LOG_COLOR;
    originalIsTTY = process.stdout.isTTY;
    // Clear env var for clean test state
    delete process.env.PAGEMD_LOG_COLOR;
  });

  afterEach(() => {
    // Restore original state
    if (originalEnv !== undefined) {
      process.env.PAGEMD_LOG_COLOR = originalEnv;
    } else {
      delete process.env.PAGEMD_LOG_COLOR;
    }
    process.stdout.isTTY = originalIsTTY;
  });

  describe('isColorsEnabled', () => {
    it('returns true when TTY and no env override', () => {
      process.stdout.isTTY = true;
      delete process.env.PAGEMD_LOG_COLOR;
      expect(isColorsEnabled()).toBe(true);
    });

    it('returns false when not TTY and no env override', () => {
      process.stdout.isTTY = false;
      delete process.env.PAGEMD_LOG_COLOR;
      expect(isColorsEnabled()).toBe(false);
    });

    it('PAGEMD_LOG_COLOR=1 forces colors on', () => {
      process.stdout.isTTY = false;
      process.env.PAGEMD_LOG_COLOR = '1';
      expect(isColorsEnabled()).toBe(true);
    });

    it('PAGEMD_LOG_COLOR=true forces colors on', () => {
      process.stdout.isTTY = false;
      process.env.PAGEMD_LOG_COLOR = 'true';
      expect(isColorsEnabled()).toBe(true);
    });

    it('PAGEMD_LOG_COLOR=yes forces colors on', () => {
      process.stdout.isTTY = false;
      process.env.PAGEMD_LOG_COLOR = 'yes';
      expect(isColorsEnabled()).toBe(true);
    });

    it('PAGEMD_LOG_COLOR=0 forces colors off', () => {
      process.stdout.isTTY = true;
      process.env.PAGEMD_LOG_COLOR = '0';
      expect(isColorsEnabled()).toBe(false);
    });

    it('PAGEMD_LOG_COLOR=false forces colors off', () => {
      process.stdout.isTTY = true;
      process.env.PAGEMD_LOG_COLOR = 'false';
      expect(isColorsEnabled()).toBe(false);
    });

    it('PAGEMD_LOG_COLOR=no forces colors off', () => {
      process.stdout.isTTY = true;
      process.env.PAGEMD_LOG_COLOR = 'no';
      expect(isColorsEnabled()).toBe(false);
    });

    it('handles case insensitive env values', () => {
      process.stdout.isTTY = false;
      process.env.PAGEMD_LOG_COLOR = 'TRUE';
      expect(isColorsEnabled()).toBe(true);

      process.env.PAGEMD_LOG_COLOR = 'FALSE';
      expect(isColorsEnabled()).toBe(false);
    });
  });

  describe('colorLevel', () => {
    it('handles undefined level', () => {
      const result = colorLevel(undefined);
      expect(result).toContain('undefined');
    });

    it('handles null level', () => {
      const result = colorLevel(null);
      expect(result).toContain('undefined');
    });

    it('returns level string for valid levels', () => {
      // When colors disabled, should return plain text
      process.stdout.isTTY = false;
      delete process.env.PAGEMD_LOG_COLOR;

      expect(colorLevel('INFO')).toBe('INFO');
      expect(colorLevel('WARN')).toBe('WARN');
      expect(colorLevel('ERROR')).toBe('ERROR');
      expect(colorLevel('DEBUG')).toBe('DEBUG');
      expect(colorLevel('TRACE')).toBe('TRACE');
      expect(colorLevel('FATAL')).toBe('FATAL');
    });

    it('handles lowercase levels', () => {
      process.stdout.isTTY = false;
      // colorLevel preserves original case in output
      expect(colorLevel('info')).toBe('info');
    });
  });

  describe('colorResult', () => {
    it('handles undefined result', () => {
      const result = colorResult(undefined);
      expect(result).toContain('undefined');
    });

    it('handles null result', () => {
      const result = colorResult(null);
      expect(result).toContain('undefined');
    });

    it('returns result string for valid results', () => {
      // When colors disabled, should return plain text
      process.stdout.isTTY = false;
      delete process.env.PAGEMD_LOG_COLOR;

      expect(colorResult('success')).toBe('success');
      expect(colorResult('ok')).toBe('ok');
      expect(colorResult('fail')).toBe('fail');
      expect(colorResult('warning')).toBe('warning');
      expect(colorResult('skip')).toBe('skip');
    });

    it('handles mixed case results', () => {
      process.stdout.isTTY = false;
      expect(colorResult('SUCCESS')).toBe('SUCCESS');
      expect(colorResult('Success')).toBe('Success');
    });
  });

  describe('colors object', () => {
    it('exports all expected color functions', () => {
      expect(colors.timestamp).toBeTypeOf('function');
      expect(colors.levelFatal).toBeTypeOf('function');
      expect(colors.levelError).toBeTypeOf('function');
      expect(colors.levelWarn).toBeTypeOf('function');
      expect(colors.levelInfo).toBeTypeOf('function');
      expect(colors.levelDebug).toBeTypeOf('function');
      expect(colors.levelTrace).toBeTypeOf('function');
      expect(colors.resultSuccess).toBeTypeOf('function');
      expect(colors.resultFail).toBeTypeOf('function');
      expect(colors.resultWarn).toBeTypeOf('function');
      expect(colors.resultDefault).toBeTypeOf('function');
      expect(colors.module).toBeTypeOf('function');
      expect(colors.section).toBeTypeOf('function');
      expect(colors.message).toBeTypeOf('function');
      expect(colors.data).toBeTypeOf('function');
      expect(colors.delimiter).toBeTypeOf('function');
    });

    it('returns input when colors disabled', () => {
      process.stdout.isTTY = false;
      delete process.env.PAGEMD_LOG_COLOR;

      expect(colors.timestamp('test')).toBe('test');
      expect(colors.module('cli')).toBe('cli');
      expect(colors.message('hello')).toBe('hello');
    });
  });
});
