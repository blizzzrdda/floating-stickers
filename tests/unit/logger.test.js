/**
 * Tests for the Logger utility
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { Logger, formatError, sanitizeData, LOG_LEVELS } from '../../utils/logger.js';
import * as environment from '../../utils/environment.js';

// Mock the environment module
jest.mock('../../utils/environment.js', () => {
  const original = jest.requireActual('../../utils/environment.js');
  return {
    ...original,
    isDevelopment: jest.fn().mockImplementation(() => true),
    isTest: jest.fn().mockImplementation(() => true),
    isProduction: jest.fn().mockImplementation(() => false)
  };
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({ size: 1000 }),
  appendFileSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  unlinkSync: jest.fn(),
  rmdirSync: jest.fn()
}));

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
  console.debug = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;

  // Clear all mocks
  jest.clearAllMocks();
});

describe('Logger Utility', () => {
  test('Logger is defined', () => {
    expect(Logger).toBeDefined();
  });

  test('Logger constructor sets default values', () => {
    const logger = new Logger();
    expect(logger.category).toBe('App');
    expect(logger.enableConsole).toBe(true);
    expect(logger.enableFile).toBe(false); // false because isProduction() returns false
    expect(logger.logLevel).toBe(LOG_LEVELS.DEBUG); // DEBUG because isDevelopment() returns true
  });

  test('Logger constructor accepts custom options', () => {
    const logger = new Logger({
      category: 'Test',
      enableConsole: false,
      logLevel: LOG_LEVELS.ERROR
    });

    expect(logger.category).toBe('Test');
    expect(logger.enableConsole).toBe(false);
    expect(logger.logLevel).toBe(LOG_LEVELS.ERROR);
  });

  test('Logger.debug calls console.debug in development mode', () => {
    const logger = new Logger({ category: 'Test' });
    logger.debug('Test message');

    expect(console.debug).toHaveBeenCalled();
  });

  test('Logger.info calls console.info', () => {
    const logger = new Logger({ category: 'Test' });
    logger.info('Test message');

    expect(console.info).toHaveBeenCalled();
  });

  test('Logger.warn calls console.warn', () => {
    const logger = new Logger({ category: 'Test' });
    logger.warn('Test message');

    expect(console.warn).toHaveBeenCalled();
  });

  test('Logger.error calls console.error', () => {
    const logger = new Logger({ category: 'Test' });
    logger.error('Test message');

    expect(console.error).toHaveBeenCalled();
  });

  test('Logger respects log level', () => {
    const logger = new Logger({
      category: 'Test',
      logLevel: LOG_LEVELS.WARN
    });

    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  test('Logger.child creates a new logger with inherited settings', () => {
    const parent = new Logger({
      category: 'Parent',
      logLevel: LOG_LEVELS.WARN,
      enableConsole: false
    });

    const child = parent.child('Child');

    expect(child).toBeInstanceOf(Logger);
    expect(child.category).toBe('Child');
    expect(child.logLevel).toBe(LOG_LEVELS.WARN);
    expect(child.enableConsole).toBe(false);
  });

  test('formatError handles Error objects', () => {
    const error = new Error('Test error');
    error.code = 'TEST_ERROR';

    const formatted = formatError(error);

    expect(formatted.name).toBe('Error');
    expect(formatted.message).toBe('Test error');
    expect(formatted.stack).toBeDefined();
    expect(formatted.code).toBe('TEST_ERROR');
  });

  test('formatError handles non-Error objects', () => {
    const nonError = { message: 'Not an error' };
    const formatted = formatError(nonError);

    expect(formatted).toEqual(nonError);
  });

  test('sanitizeData masks sensitive information in strings', () => {
    const sensitive = 'api_key=secret123&password=pass123';
    const sanitized = sanitizeData(sensitive);

    expect(sanitized).toContain('***REDACTED***');
    expect(sanitized).not.toContain('secret123');
    expect(sanitized).not.toContain('pass123');
  });

  test('sanitizeData masks sensitive fields in objects', () => {
    const sensitive = {
      username: 'user',
      password: 'secret',
      data: {
        apiKey: '12345',
        content: 'safe'
      }
    };

    const sanitized = sanitizeData(sensitive);

    expect(sanitized.username).toBe('user');
    expect(sanitized.password).toBe('***REDACTED***');
    expect(sanitized.data.apiKey).toBe('***REDACTED***');
    expect(sanitized.data.content).toBe('safe');
  });

  test('Logger creates log directory in production mode', () => {
    // Mock production environment
    environment.isProduction.mockReturnValue(true);
    environment.isTest.mockReturnValue(false);

    const logger = new Logger();

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  test('Logger writes to file in production mode', () => {
    // Mock production environment
    environment.isProduction.mockReturnValue(true);
    environment.isTest.mockReturnValue(false);

    const logger = new Logger();
    logger.writeToFile('Test message', LOG_LEVELS.INFO);

    expect(fs.appendFileSync).toHaveBeenCalled();
  });

  test('Logger does not write to file in test mode', () => {
    // Ensure test environment
    environment.isTest.mockReturnValue(true);

    const logger = new Logger({ enableFile: true });
    logger.writeToFile('Test message', LOG_LEVELS.INFO);

    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });
});
