/**
 * Tests for the Content Recovery utility
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  findBackupFiles,
  recoverFromBackup,
  createEmptyContent,
  repairCorruptedFile,
  recoverContent,
  CircuitBreaker
} from '../../utils/contentRecovery.js';
import { ERROR_CATEGORIES } from '../../utils/errorHandler.js';

// Mock the environment module
jest.mock('../../utils/environment.js', () => {
  const original = jest.requireActual('../../utils/environment.js');
  return {
    ...original,
    isTest: jest.fn().mockImplementation(() => true)
  };
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    readdir: jest.fn().mockResolvedValue([
      'test.json',
      'test.json.backup-123456',
      'test.json.pre-update'
    ]),
    stat: jest.fn().mockResolvedValue({
      mtime: new Date()
    }),
    readFile: jest.fn().mockResolvedValue('{"test": "data"}'),
    mkdir: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock jsonUtils module
jest.mock('../../utils/jsonUtils.js', () => ({
  safeReadJSON: jest.fn().mockResolvedValue({ test: 'data' }),
  safeWriteJSON: jest.fn().mockResolvedValue(true),
  backupJSONFile: jest.fn().mockResolvedValue('test.json.backup-123456')
}));

describe('Content Recovery Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findBackupFiles returns sorted backup files', async () => {
    const backupFiles = await findBackupFiles('test.json');

    expect(fs.promises.readdir).toHaveBeenCalled();
    expect(fs.promises.stat).toHaveBeenCalled();
    expect(backupFiles.length).toBeGreaterThan(0);
  });

  test('findBackupFiles returns empty array if directory does not exist', async () => {
    fs.existsSync.mockReturnValueOnce(false);

    const backupFiles = await findBackupFiles('test.json');

    expect(backupFiles).toEqual([]);
  });

  test('recoverFromBackup returns content from backup file', async () => {
    const content = await recoverFromBackup('test.json');

    expect(content).toEqual({ test: 'data' });
  });

  test('recoverFromBackup returns null if no backup files found', async () => {
    fs.promises.readdir.mockResolvedValueOnce([]);

    const content = await recoverFromBackup('test.json');

    expect(content).toBeNull();
  });

  test('createEmptyContent creates directory if it does not exist', async () => {
    fs.existsSync.mockReturnValueOnce(false);

    const result = await createEmptyContent('test/test.json', []);

    expect(fs.promises.mkdir).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('repairCorruptedFile creates backup before repair', async () => {
    const content = await repairCorruptedFile('test.json');

    expect(content).toEqual({ test: 'data' });
    expect(require('../../utils/jsonUtils.js').backupJSONFile).toHaveBeenCalled();
  });

  test('recoverContent handles FILE_NOT_FOUND error', async () => {
    const result = await recoverContent('test.json', ERROR_CATEGORIES.FILE_NOT_FOUND, []);

    expect(result.success).toBe(true);
    expect(result.recoveryMethod).toBe('backup');
  });

  test('recoverContent handles FILE_CORRUPTED error', async () => {
    const result = await recoverContent('test.json', ERROR_CATEGORIES.FILE_CORRUPTED, []);

    expect(result.success).toBe(true);
    expect(result.recoveryMethod).toBe('repair');
  });

  test('recoverContent handles PERMISSION_DENIED error', async () => {
    const result = await recoverContent('test.json', ERROR_CATEGORIES.PERMISSION_DENIED, []);

    expect(result.recoveryMethod).toBe('failed');
  });

  test('recoverContent falls back to empty content if all recovery methods fail', async () => {
    require('../../utils/jsonUtils.js').safeReadJSON.mockResolvedValueOnce(null);
    require('../../utils/jsonUtils.js').safeReadJSON.mockResolvedValueOnce(null);

    const result = await recoverContent('test.json', ERROR_CATEGORIES.FILE_CORRUPTED, []);

    expect(result.success).toBe(true);
    expect(result.recoveryMethod).toBe('empty');
  });

  test('CircuitBreaker executes function when circuit is closed', async () => {
    const circuitBreaker = new CircuitBreaker();
    const fn = jest.fn().mockResolvedValue('success');

    const result = await circuitBreaker.execute('test', fn, 'arg1', 'arg2');

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(result).toBe('success');
  });

  test('CircuitBreaker opens circuit after failure threshold is reached', async () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 2 });
    const fn = jest.fn().mockRejectedValue(new Error('test error'));

    // First failure
    await expect(circuitBreaker.execute('test', fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);

    // Second failure - should open the circuit
    await expect(circuitBreaker.execute('test', fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(2);

    // Circuit is now open - function should not be called
    await expect(circuitBreaker.execute('test', fn)).rejects.toThrow('Circuit breaker is open');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('CircuitBreaker resets circuit', async () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 1 });
    const fn = jest.fn().mockRejectedValue(new Error('test error'));

    // Failure - should open the circuit
    await expect(circuitBreaker.execute('test', fn)).rejects.toThrow();

    // Reset the circuit
    circuitBreaker.reset('test');

    // Circuit should be closed again
    fn.mockResolvedValueOnce('success');
    const result = await circuitBreaker.execute('test', fn);
    expect(result).toBe('success');
  });
});
