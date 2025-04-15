/**
 * Tests for the FileLogger utility
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { FileLogger, DEFAULT_LOG_DIR } from '../../utils/fileLogger.js';
import { LOG_LEVELS } from '../../utils/debugUtils.js';
import * as environment from '../../utils/environment.js';

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
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({
    size: 1000,
    isDirectory: jest.fn().mockReturnValue(true),
    isFile: jest.fn().mockReturnValue(true),
    mtime: new Date()
  }),
  appendFileSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue(['file1.log', 'file2.log']),
  unlinkSync: jest.fn(),
  rmdirSync: jest.fn(),
  renameSync: jest.fn()
}));

// Mock console.error
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console.error
  console.error = originalConsoleError;

  // Clear all mocks
  jest.clearAllMocks();
});

describe('FileLogger Utility', () => {
  test('FileLogger is defined', () => {
    expect(FileLogger).toBeDefined();
  });

  test('FileLogger constructor sets default values', () => {
    const logger = new FileLogger();
    expect(logger.logDir).toBe(DEFAULT_LOG_DIR);
    expect(logger.useTimestamp).toBe(true);
    expect(logger.useLevelPrefix).toBe(true);
    expect(logger.createSubdirs).toBe(true);
  });

  test('FileLogger constructor accepts custom options', () => {
    const customLogDir = '/custom/log/dir';
    const customLogFile = 'custom.log';

    const logger = new FileLogger({
      logDir: customLogDir,
      logFile: customLogFile,
      useTimestamp: false,
      useLevelPrefix: false,
      createSubdirs: false
    });

    expect(logger.logDir).toBe(customLogDir);
    expect(logger.logFile).toBe(customLogFile);
    expect(logger.useTimestamp).toBe(false);
    expect(logger.useLevelPrefix).toBe(false);
    expect(logger.createSubdirs).toBe(false);
  });

  test('setupLogDirectory creates directories if they do not exist', () => {
    // Mock isTest to return false so setupLogDirectory runs
    environment.isTest.mockReturnValueOnce(false);
    fs.existsSync.mockReturnValue(false);

    const logger = new FileLogger();

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  test('setupLogDirectory does not create directories if they exist', () => {
    // Mock isTest to return false so setupLogDirectory runs
    environment.isTest.mockReturnValueOnce(false);
    fs.existsSync.mockReturnValue(true);

    const logger = new FileLogger();

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  test('rotateLogFileIfNeeded rotates file if it exceeds max size', () => {
    // Mock isTest to return false so setupLogDirectory runs
    environment.isTest.mockReturnValueOnce(false);
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValueOnce({
      size: 10 * 1024 * 1024, // 10MB, exceeds default 5MB limit
      isDirectory: jest.fn().mockReturnValue(false),
      isFile: jest.fn().mockReturnValue(true)
    });

    const logger = new FileLogger();
    const testFile = 'test.log';

    logger.rotateLogFileIfNeeded(testFile);

    expect(fs.renameSync).toHaveBeenCalled();
  });

  test('rotateLogFileIfNeeded does not rotate file if it does not exceed max size', () => {
    // Mock isTest to return false so setupLogDirectory runs
    environment.isTest.mockReturnValueOnce(false);
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValueOnce({
      size: 1 * 1024 * 1024, // 1MB, below default 5MB limit
      isDirectory: jest.fn().mockReturnValue(false),
      isFile: jest.fn().mockReturnValue(true)
    });

    const logger = new FileLogger();
    const testFile = 'test.log';

    logger.rotateLogFileIfNeeded(testFile);

    expect(fs.renameSync).not.toHaveBeenCalled();
  });

  test('cleanupOldLogFiles removes old directories when using subdirs', () => {
    // Mock isTest to return false so setupLogDirectory runs
    environment.isTest.mockReturnValueOnce(false);
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValueOnce([
      '2023-01-01', '2023-01-02', '2023-01-03',
      '2023-01-04', '2023-01-05', '2023-01-06',
      '2023-01-07', '2023-01-08', '2023-01-09',
      '2023-01-10', '2023-01-11', '2023-01-12'
    ]);

    const logger = new FileLogger({ createSubdirs: true });

    logger.cleanupOldLogFiles();

    // Should remove directories beyond the limit (default is 10)
    expect(fs.readdirSync).toHaveBeenCalled();
    expect(logger.removeDirectory).toHaveBeenCalledTimes(2);
  });

  test('cleanupOldLogFiles removes old files when not using subdirs', () => {
    // Mock isTest to return false so setupLogDirectory runs
    environment.isTest.mockReturnValueOnce(false);
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValueOnce([
      'file1.log', 'file2.log', 'file3.log',
      'file4.log', 'file5.log', 'file6.log',
      'file7.log', 'file8.log', 'file9.log',
      'file10.log', 'file11.log', 'file12.log'
    ]);

    const logger = new FileLogger({ createSubdirs: false });

    logger.cleanupOldLogFiles();

    // Should remove files beyond the limit (default is 10)
    expect(fs.readdirSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
  });

  test('writeToFile does not write in test environment', () => {
    environment.isTest.mockReturnValue(true);

    const logger = new FileLogger();
    logger.writeToFile('Test message', LOG_LEVELS.INFO);

    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  test('writeToFile writes to both level-specific and combined log files', () => {
    // Mock isTest to return false
    environment.isTest.mockReturnValue(false);

    const logger = new FileLogger();
    // Mock the log files
    logger.logFiles = {
      [LOG_LEVELS.INFO]: 'info.log'
    };
    logger.combinedLogFile = 'combined.log';
    // Mock appendToFile
    logger.appendToFile = jest.fn();

    logger.writeToFile('Test message', LOG_LEVELS.INFO);

    expect(logger.appendToFile).toHaveBeenCalledTimes(2);
    expect(logger.appendToFile).toHaveBeenCalledWith('info.log', 'Test message');
    expect(logger.appendToFile).toHaveBeenCalledWith('combined.log', 'Test message');
  });

  test('appendToFile creates parent directory if it does not exist', () => {
    // Mock isTest to return false
    environment.isTest.mockReturnValue(false);
    fs.existsSync.mockReturnValue(false);

    const logger = new FileLogger();
    logger.appendToFile('test/file.log', 'Test message');

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.appendFileSync).toHaveBeenCalled();
  });

  test('log method calls writeToFile', () => {
    const logger = new FileLogger();
    logger.writeToFile = jest.fn();

    logger.log('Test message', LOG_LEVELS.INFO);

    expect(logger.writeToFile).toHaveBeenCalledWith('Test message', LOG_LEVELS.INFO);
  });
});
