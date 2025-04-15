/**
 * Tests for the Error Handler utility
 */

import { jest } from '@jest/globals';
import {
  ERROR_CATEGORIES,
  categorizeError,
  getUserFriendlyMessage,
  generateErrorCode,
  handleError,
  withErrorHandling,
  handleContentLoadingError
} from '../../utils/errorHandler.js';
import * as environment from '../../utils/environment.js';

// Mock the environment module
jest.mock('../../utils/environment.js', () => {
  const original = jest.requireActual('../../utils/environment.js');
  return {
    ...original,
    isDevelopment: jest.fn().mockImplementation(() => true)
  };
});

// Mock the logger
jest.mock('../../utils/logger.js', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn()
  }))
}));

describe('Error Handler Utility', () => {
  test('ERROR_CATEGORIES contains expected categories', () => {
    expect(ERROR_CATEGORIES).toHaveProperty('FILE_NOT_FOUND');
    expect(ERROR_CATEGORIES).toHaveProperty('PERMISSION_DENIED');
    expect(ERROR_CATEGORIES).toHaveProperty('FILE_CORRUPTED');
    expect(ERROR_CATEGORIES).toHaveProperty('NETWORK_ERROR');
    expect(ERROR_CATEGORIES).toHaveProperty('TIMEOUT');
    expect(ERROR_CATEGORIES).toHaveProperty('VALIDATION_ERROR');
    expect(ERROR_CATEGORIES).toHaveProperty('UNKNOWN');
  });

  test('categorizeError correctly identifies file not found errors', () => {
    const error1 = new Error('File not found');
    error1.code = 'ENOENT';

    const error2 = new Error('no such file or directory');

    expect(categorizeError(error1)).toBe(ERROR_CATEGORIES.FILE_NOT_FOUND);
    expect(categorizeError(error2)).toBe(ERROR_CATEGORIES.FILE_NOT_FOUND);
  });

  test('categorizeError correctly identifies permission errors', () => {
    const error1 = new Error('Permission denied');
    error1.code = 'EACCES';

    const error2 = new Error('access denied');

    expect(categorizeError(error1)).toBe(ERROR_CATEGORIES.PERMISSION_DENIED);
    expect(categorizeError(error2)).toBe(ERROR_CATEGORIES.PERMISSION_DENIED);
  });

  test('categorizeError correctly identifies file corruption errors', () => {
    const error1 = new Error('JSON parse error');
    const error2 = new Error('Unexpected token in JSON');

    expect(categorizeError(error1)).toBe(ERROR_CATEGORIES.FILE_CORRUPTED);
    expect(categorizeError(error2)).toBe(ERROR_CATEGORIES.FILE_CORRUPTED);
  });

  test('categorizeError correctly identifies network errors', () => {
    const error1 = new Error('Network error');
    error1.code = 'ECONNREFUSED';

    const error2 = new Error('connection reset');

    expect(categorizeError(error1)).toBe(ERROR_CATEGORIES.NETWORK_ERROR);
    expect(categorizeError(error2)).toBe(ERROR_CATEGORIES.NETWORK_ERROR);
  });

  test('categorizeError correctly identifies timeout errors', () => {
    const error1 = new Error('Operation timed out');
    error1.code = 'ETIMEDOUT';

    const error2 = new Error('request timeout');

    expect(categorizeError(error1)).toBe(ERROR_CATEGORIES.TIMEOUT);
    expect(categorizeError(error2)).toBe(ERROR_CATEGORIES.TIMEOUT);
  });

  test('categorizeError correctly identifies validation errors', () => {
    const error1 = new Error('Validation failed');
    const error2 = new Error('invalid data format');

    expect(categorizeError(error1)).toBe(ERROR_CATEGORIES.VALIDATION_ERROR);
    expect(categorizeError(error2)).toBe(ERROR_CATEGORIES.VALIDATION_ERROR);
  });

  test('categorizeError returns UNKNOWN for unrecognized errors', () => {
    const error = new Error('Some random error');

    expect(categorizeError(error)).toBe(ERROR_CATEGORIES.UNKNOWN);
  });

  test('getUserFriendlyMessage returns appropriate messages for each category', () => {
    const error = new Error('Test error');

    // Test each category
    for (const category in ERROR_CATEGORIES) {
      const message = getUserFriendlyMessage(ERROR_CATEGORIES[category], error);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    }

    // Test unknown category
    const unknownMessage = getUserFriendlyMessage('NON_EXISTENT_CATEGORY', error);
    expect(typeof unknownMessage).toBe('string');
    expect(unknownMessage.length).toBeGreaterThan(0);
  });

  test('getUserFriendlyMessage includes error message in development mode', () => {
    environment.isDevelopment.mockReturnValue(true);

    const error = new Error('Specific error details');
    const message = getUserFriendlyMessage(ERROR_CATEGORIES.UNKNOWN, error);

    expect(message).toContain('Specific error details');
  });

  test('getUserFriendlyMessage does not include error message in production mode', () => {
    environment.isDevelopment.mockReturnValue(false);

    const error = new Error('Specific error details');
    const message = getUserFriendlyMessage(ERROR_CATEGORIES.UNKNOWN, error);

    expect(message).not.toContain('Specific error details');
  });

  test('generateErrorCode returns a unique error code', () => {
    const code1 = generateErrorCode();
    const code2 = generateErrorCode();

    expect(code1).toMatch(/^ERR-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(code2).toMatch(/^ERR-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(code1).not.toBe(code2);
  });

  test('handleError returns processed error information', () => {
    const error = new Error('Test error');
    const context = { fileName: 'test.json' };

    const result = handleError(error, context);

    expect(result).toHaveProperty('errorCode');
    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('message', 'Test error');
    expect(result).toHaveProperty('userMessage');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('recoverable');
  });

  test('withErrorHandling wraps a function with error handling', async () => {
    const successFn = async () => 'success';
    const failureFn = async () => { throw new Error('Test error'); };

    const wrappedSuccess = withErrorHandling(successFn);
    const wrappedFailure = withErrorHandling(failureFn);

    const successResult = await wrappedSuccess();
    const failureResult = await wrappedFailure();

    expect(successResult).toBe('success');
    expect(failureResult).toHaveProperty('errorCode');
    expect(failureResult).toHaveProperty('category');
    expect(failureResult).toHaveProperty('message', 'Test error');
  });

  test('handleContentLoadingError adds content-loading operation to context', () => {
    const error = new Error('Test error');
    const context = { fileName: 'test.json' };

    const result = handleContentLoadingError(error, context);

    expect(result).toHaveProperty('errorCode');
    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('message', 'Test error');
  });
});
