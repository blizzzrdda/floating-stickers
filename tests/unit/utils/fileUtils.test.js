/**
 * Unit tests for fileUtils.js
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import {
  ensureDirectoryExists,
  createFileBackup,
  safeDeleteFile,
  isFileEmpty,
  safeReadFile,
  safeWriteFile,
  safeAppendFile
} from '../../../utils/fileUtils.js';

// Mock the fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    copyFile: jest.fn(),
    unlink: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    readdir: jest.fn()
  }
}));

// Mock the Logger class
jest.mock('../../../utils/logger.js', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('fileUtils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', async () => {
      fs.existsSync.mockReturnValue(false);
      fs.promises.mkdir.mockResolvedValue(undefined);

      const result = await ensureDirectoryExists('/test/dir');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/dir');
      expect(fs.promises.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
      expect(result).toBe(true);
    });

    it('should not create directory if it already exists', async () => {
      fs.existsSync.mockReturnValue(true);

      const result = await ensureDirectoryExists('/test/dir');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/dir');
      expect(fs.promises.mkdir).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors and return false', async () => {
      fs.existsSync.mockReturnValue(false);
      fs.promises.mkdir.mockRejectedValue(new Error('Test error'));

      const result = await ensureDirectoryExists('/test/dir');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/dir');
      expect(fs.promises.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
      expect(result).toBe(false);
    });
  });

  describe('createFileBackup', () => {
    it('should create a backup of a file', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.copyFile.mockResolvedValue(undefined);
      
      // Mock Date.now() to return a fixed timestamp
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      const result = await createFileBackup('/test/file.txt', 'test');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.copyFile).toHaveBeenCalledWith('/test/file.txt', '/test/file.txt.test-1234567890');
      expect(result).toBe('/test/file.txt.test-1234567890');

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should return null if file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await createFileBackup('/test/file.txt', 'test');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.copyFile).not.toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('should handle errors and return null', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.copyFile.mockRejectedValue(new Error('Test error'));

      const result = await createFileBackup('/test/file.txt', 'test');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.copyFile).toHaveBeenCalled();
      expect(result).toBe(null);
    });
  });

  describe('safeDeleteFile', () => {
    it('should delete a file and create a backup', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.copyFile.mockResolvedValue(undefined);
      fs.promises.unlink.mockResolvedValue(undefined);
      
      // Mock Date.now() to return a fixed timestamp
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      const result = await safeDeleteFile('/test/file.txt', true);

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.copyFile).toHaveBeenCalled();
      expect(fs.promises.unlink).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBe(true);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should delete a file without creating a backup', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.unlink.mockResolvedValue(undefined);

      const result = await safeDeleteFile('/test/file.txt', false);

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.copyFile).not.toHaveBeenCalled();
      expect(fs.promises.unlink).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBe(true);
    });

    it('should return true if file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await safeDeleteFile('/test/file.txt', true);

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.copyFile).not.toHaveBeenCalled();
      expect(fs.promises.unlink).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle errors and return false', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.unlink.mockRejectedValue(new Error('Test error'));

      const result = await safeDeleteFile('/test/file.txt', false);

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.unlink).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBe(false);
    });
  });

  describe('isFileEmpty', () => {
    it('should return true if file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await isFileEmpty('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.stat).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return true if file is empty', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.stat.mockResolvedValue({ size: 0 });

      const result = await isFileEmpty('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.stat).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBe(true);
    });

    it('should return false if file is not empty', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.stat.mockResolvedValue({ size: 100 });

      const result = await isFileEmpty('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.stat).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBe(false);
    });

    it('should handle errors and return true', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.stat.mockRejectedValue(new Error('Test error'));

      const result = await isFileEmpty('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.stat).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBe(true);
    });
  });

  describe('safeReadFile', () => {
    it('should read a file successfully', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.readFile.mockResolvedValue('file content');

      const result = await safeReadFile('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf8');
      expect(result).toBe('file content');
    });

    it('should return null if file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await safeReadFile('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.readFile).not.toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('should handle errors and return null', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.readFile.mockRejectedValue(new Error('Test error'));

      const result = await safeReadFile('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf8');
      expect(result).toBe(null);
    });
  });

  describe('safeWriteFile', () => {
    it('should write to a file successfully', async () => {
      fs.promises.mkdir.mockResolvedValue(undefined);
      fs.promises.writeFile.mockResolvedValue(undefined);

      const result = await safeWriteFile('/test/file.txt', 'file content');

      expect(fs.promises.writeFile).toHaveBeenCalledWith('/test/file.txt', 'file content', {});
      expect(result).toBe(true);
    });

    it('should create backup if file exists and createBackup is true', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.mkdir.mockResolvedValue(undefined);
      fs.promises.copyFile.mockResolvedValue(undefined);
      fs.promises.writeFile.mockResolvedValue(undefined);

      const result = await safeWriteFile('/test/file.txt', 'file content', { createBackup: true });

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.promises.copyFile).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalledWith('/test/file.txt', 'file content', { createBackup: true });
      expect(result).toBe(true);
    });

    it('should handle errors and return false', async () => {
      fs.promises.mkdir.mockResolvedValue(undefined);
      fs.promises.writeFile.mockRejectedValue(new Error('Test error'));

      const result = await safeWriteFile('/test/file.txt', 'file content');

      expect(fs.promises.writeFile).toHaveBeenCalledWith('/test/file.txt', 'file content', {});
      expect(result).toBe(false);
    });
  });

  describe('safeAppendFile', () => {
    it('should append to a file successfully', async () => {
      fs.promises.mkdir.mockResolvedValue(undefined);
      fs.promises.appendFile.mockResolvedValue(undefined);

      const result = await safeAppendFile('/test/file.txt', 'file content');

      expect(fs.promises.appendFile).toHaveBeenCalledWith('/test/file.txt', 'file content', {});
      expect(result).toBe(true);
    });

    it('should handle errors and return false', async () => {
      fs.promises.mkdir.mockResolvedValue(undefined);
      fs.promises.appendFile.mockRejectedValue(new Error('Test error'));

      const result = await safeAppendFile('/test/file.txt', 'file content');

      expect(fs.promises.appendFile).toHaveBeenCalledWith('/test/file.txt', 'file content', {});
      expect(result).toBe(false);
    });
  });
});
