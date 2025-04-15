/**
 * Tests for error handling and edge cases
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import StickerDataManager from '../../utils/stickerUtils.js';
import { ERROR_CATEGORIES } from '../../utils/errorHandler.js';
import {
  createTempTestDir,
  cleanupTempTestDir
} from '../helpers/testUtils.js';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('[]'),
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock jsonUtils module
jest.mock('../../utils/jsonUtils.js', () => ({
  safeReadJSON: jest.fn().mockResolvedValue([]),
  safeWriteJSON: jest.fn().mockResolvedValue(true),
  backupJSONFile: jest.fn().mockResolvedValue('backup-file.json'),
  validateArrayData: jest.fn().mockReturnValue(true),
  validateJSONData: jest.fn().mockReturnValue(true)
}));

// Mock contentLoader module
jest.mock('../../utils/contentLoader.js', () => ({
  loadArrayContent: jest.fn().mockResolvedValue({ content: [], source: 'default' }),
  loadArrayContentWithFeedback: jest.fn().mockResolvedValue({ content: [], source: 'default' }),
  validateStickerContent: jest.fn().mockReturnValue(true),
  validateStickerLayout: jest.fn().mockReturnValue(true),
  validateStickerContentArray: jest.fn().mockReturnValue(true),
  validateStickerLayoutArray: jest.fn().mockReturnValue(true)
}));

// Mock errorHandler module
jest.mock('../../utils/errorHandler.js', () => ({
  handleContentLoadingError: jest.fn(),
  ERROR_CATEGORIES: {
    FILE_ACCESS_ERROR: 'FILE_ACCESS_ERROR',
    PARSE_ERROR: 'PARSE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    WRITE_ERROR: 'WRITE_ERROR',
    UNKNOWN: 'UNKNOWN'
  }
}));

// Mock errorDisplay module
jest.mock('../../ui/errorDisplay.js', () => ({
  displayError: jest.fn(),
  displayWarning: jest.fn(),
  displayInfo: jest.fn()
}));

// Mock contentRecovery module
jest.mock('../../utils/contentRecovery.js', () => ({
  recoverContent: jest.fn().mockResolvedValue({
    recovered: true,
    content: []
  })
}));

describe('Error Handling and Edge Cases', () => {
  let testDir;
  let stickerManager;
  
  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = createTempTestDir();
    stickerManager = new StickerDataManager(testDir);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock fs.existsSync to return false by default (files don't exist)
    fs.existsSync.mockReturnValue(false);
  });
  
  afterEach(() => {
    // Clean up test files after each test
    cleanupTempTestDir(testDir);
  });
  
  test('loadLayoutData handles file read errors', async () => {
    // Mock file exists
    fs.existsSync.mockReturnValue(true);
    
    // Mock loadArrayContent to throw an error
    const { loadArrayContent } = require('../../utils/contentLoader.js');
    loadArrayContent.mockRejectedValue(new Error('File read error'));
    
    // Load layout data
    const result = await stickerManager.loadLayoutData({ showErrors: true });
    
    // Verify result is an empty array (default value)
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    
    // Verify error handling
    const { handleContentLoadingError } = require('../../utils/errorHandler.js');
    expect(handleContentLoadingError).toHaveBeenCalled();
  });
  
  test('loadContentData handles file read errors', async () => {
    // Mock file exists
    fs.existsSync.mockReturnValue(true);
    
    // Mock loadArrayContent to throw an error
    const { loadArrayContent } = require('../../utils/contentLoader.js');
    loadArrayContent.mockRejectedValue(new Error('File read error'));
    
    // Load content data
    const result = await stickerManager.loadContentData({ showErrors: true });
    
    // Verify result is an empty array (default value)
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    
    // Verify error handling
    const { handleContentLoadingError } = require('../../utils/errorHandler.js');
    expect(handleContentLoadingError).toHaveBeenCalled();
  });
  
  test('loadStickerData handles errors in both layout and content loading', async () => {
    // Mock checkAndMigrateData
    stickerManager.checkAndMigrateData = jest.fn().mockResolvedValue({
      success: true,
      migrated: false
    });
    
    // Mock files exist
    fs.existsSync.mockReturnValue(true);
    
    // Mock loadArrayContentWithFeedback to throw errors
    const { loadArrayContentWithFeedback } = require('../../utils/contentLoader.js');
    loadArrayContentWithFeedback.mockRejectedValue(new Error('Load error'));
    
    // Load sticker data
    const result = await stickerManager.loadStickerData({ showErrors: true });
    
    // Verify result is an empty array (default value)
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    
    // Verify displayError was called
    const { displayError } = require('../../ui/errorDisplay.js');
    expect(displayError).toHaveBeenCalled();
  });
  
  test('saveLayoutData handles invalid input', async () => {
    // Test with various invalid inputs
    expect(await stickerManager.saveLayoutData(null)).toBe(false);
    expect(await stickerManager.saveLayoutData(undefined)).toBe(false);
    expect(await stickerManager.saveLayoutData('not an array')).toBe(false);
    expect(await stickerManager.saveLayoutData(123)).toBe(false);
    expect(await stickerManager.saveLayoutData({})).toBe(false);
    
    // Verify validateArrayData was called
    const { validateArrayData } = require('../../utils/jsonUtils.js');
    expect(validateArrayData).toHaveBeenCalled();
  });
  
  test('saveContentData handles invalid input', async () => {
    // Test with various invalid inputs
    expect(await stickerManager.saveContentData(null)).toBe(false);
    expect(await stickerManager.saveContentData(undefined)).toBe(false);
    expect(await stickerManager.saveContentData('not an array')).toBe(false);
    expect(await stickerManager.saveContentData(123)).toBe(false);
    expect(await stickerManager.saveContentData({})).toBe(false);
    
    // Verify validateArrayData was called
    const { validateArrayData } = require('../../utils/jsonUtils.js');
    expect(validateArrayData).toHaveBeenCalled();
  });
  
  test('updateSticker handles invalid input', async () => {
    // Test with invalid sticker data
    const result = await stickerManager.updateSticker(null, { showErrors: true });
    
    // Verify result
    expect(result.success).toBe(false);
    
    // Verify displayError was called
    const { displayError } = require('../../ui/errorDisplay.js');
    expect(displayError).toHaveBeenCalled();
  });
  
  test('updateSticker handles missing ID', async () => {
    // Test with sticker data missing ID
    const result = await stickerManager.updateSticker({ content: 'No ID' }, { showErrors: true });
    
    // Verify result
    expect(result.success).toBe(false);
    
    // Verify displayError was called
    const { displayError } = require('../../ui/errorDisplay.js');
    expect(displayError).toHaveBeenCalled();
  });
  
  test('updateSticker handles write errors', async () => {
    // Mock safeWriteJSON to fail
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(false);
    
    // Update sticker
    const result = await stickerManager.updateSticker({
      id: 'test-sticker',
      content: 'Test content',
      position: { x: 0, y: 0 },
      size: { width: 250, height: 80 }
    }, { showErrors: true });
    
    // Verify result
    expect(result.success).toBe(false);
    
    // Verify displayError was called
    const { displayError } = require('../../ui/errorDisplay.js');
    expect(displayError).toHaveBeenCalled();
  });
  
  test('removeSticker handles non-existent sticker', async () => {
    // Mock existing stickers
    const { safeReadJSON } = require('../../utils/jsonUtils.js');
    safeReadJSON.mockImplementation((filePath) => {
      if (filePath.includes('layout')) {
        return Promise.resolve([
          {
            id: 'existing-sticker',
            position: { x: 0, y: 0 },
            size: { width: 250, height: 80 }
          }
        ]);
      } else {
        return Promise.resolve([
          {
            id: 'existing-sticker',
            content: 'Existing content'
          }
        ]);
      }
    });
    
    // Remove non-existent sticker
    const result = await stickerManager.removeSticker('non-existent-sticker');
    
    // Verify result
    expect(result.success).toBe(true); // Should still succeed even if sticker doesn't exist
    
    // Verify safeWriteJSON was called with unchanged data
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    expect(safeWriteJSON).toHaveBeenCalledTimes(2);
    
    // Get the data that was passed to safeWriteJSON
    const layoutCall = safeWriteJSON.mock.calls[0][1];
    const contentCall = safeWriteJSON.mock.calls[1][1];
    
    // Should still contain the existing sticker
    expect(layoutCall).toEqual([
      {
        id: 'existing-sticker',
        position: { x: 0, y: 0 },
        size: { width: 250, height: 80 }
      }
    ]);
    
    expect(contentCall).toEqual([
      {
        id: 'existing-sticker',
        content: 'Existing content'
      }
    ]);
  });
  
  test('removeSticker handles write errors', async () => {
    // Mock existing stickers
    const { safeReadJSON } = require('../../utils/jsonUtils.js');
    safeReadJSON.mockImplementation((filePath) => {
      if (filePath.includes('layout')) {
        return Promise.resolve([
          {
            id: 'sticker-to-remove',
            position: { x: 0, y: 0 },
            size: { width: 250, height: 80 }
          }
        ]);
      } else {
        return Promise.resolve([
          {
            id: 'sticker-to-remove',
            content: 'Content to remove'
          }
        ]);
      }
    });
    
    // Mock safeWriteJSON to fail
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(false);
    
    // Remove sticker
    const result = await stickerManager.removeSticker('sticker-to-remove', { showErrors: true });
    
    // Verify result
    expect(result.success).toBe(false);
    
    // Verify displayError was called
    const { displayError } = require('../../ui/errorDisplay.js');
    expect(displayError).toHaveBeenCalled();
  });
  
  test('sanitizeContent handles errors', async () => {
    // Mock stripHtml to throw an error
    stickerManager.stripHtml = jest.fn().mockRejectedValue(new Error('Sanitization error'));
    
    // Sanitize content
    const result = await stickerManager.sanitizeContent('<div>Test</div>');
    
    // Verify result is empty string (safe fallback)
    expect(result).toBe('');
  });
  
  test('ensureDirectoryExists creates directory if it doesn\'t exist', async () => {
    // Mock fs.existsSync to return false (directory doesn't exist)
    fs.existsSync.mockReturnValue(false);
    
    // Call ensureDirectoryExists
    await stickerManager.ensureDirectoryExists();
    
    // Verify fs.promises.mkdir was called
    expect(fs.promises.mkdir).toHaveBeenCalledWith(testDir, { recursive: true });
  });
  
  test('ensureDirectoryExists handles errors', async () => {
    // Mock fs.existsSync to return false (directory doesn't exist)
    fs.existsSync.mockReturnValue(false);
    
    // Mock fs.promises.mkdir to throw an error
    fs.promises.mkdir.mockRejectedValue(new Error('Directory creation error'));
    
    // Call ensureDirectoryExists
    await stickerManager.ensureDirectoryExists();
    
    // Function should not throw, just log the error
    // No assertions needed, just verifying it doesn't throw
  });
});
