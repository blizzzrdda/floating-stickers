/**
 * Tests for sticker creation functionality
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import StickerDataManager from '../../utils/stickerUtils.js';
import {
  createTempTestDir,
  cleanupTempTestDir,
  createMockSticker
} from '../helpers/testUtils.js';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('[]')
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

// Mock versionDetection module
jest.mock('../../utils/versionDetection.js', () => ({
  detectDataVersion: jest.fn().mockResolvedValue({
    version: 'v1',
    layoutExists: false,
    contentExists: false,
    needsMigration: false
  }),
  DATA_VERSIONS: {
    UNKNOWN: 'unknown',
    V1: 'v1'
  }
}));

// Mock dataMigration module
jest.mock('../../utils/dataMigration.js', () => ({
  migrateData: jest.fn().mockResolvedValue({ success: true, migrated: false }),
  addVersionInfo: jest.fn().mockResolvedValue({ success: true })
}));

// Mock errorDisplay module
jest.mock('../../ui/errorDisplay.js', () => ({
  displayError: jest.fn(),
  displayWarning: jest.fn(),
  displayInfo: jest.fn()
}));

describe('Sticker Creation', () => {
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
  
  test('createSticker creates a new sticker with default values', async () => {
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Create a new sticker
    const result = await stickerManager.createSticker();
    
    // Verify result
    expect(result.success).toBe(true);
    expect(result.sticker).toBeDefined();
    expect(result.sticker.id).toBeDefined();
    expect(result.sticker.content).toBe('');
    expect(result.sticker.position).toEqual({ x: 0, y: 0 });
    expect(result.sticker.size).toEqual({ width: 250, height: 80 });
    
    // Verify safeWriteJSON was called twice (once for layout, once for content)
    expect(safeWriteJSON).toHaveBeenCalledTimes(2);
  });
  
  test('createSticker creates a sticker with custom values', async () => {
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Create a new sticker with custom values
    const customSticker = {
      content: 'Custom content',
      position: { x: 100, y: 200 },
      size: { width: 300, height: 150 }
    };
    
    const result = await stickerManager.createSticker(customSticker);
    
    // Verify result
    expect(result.success).toBe(true);
    expect(result.sticker).toBeDefined();
    expect(result.sticker.id).toBeDefined();
    expect(result.sticker.content).toBe('Custom content');
    expect(result.sticker.position).toEqual({ x: 100, y: 200 });
    expect(result.sticker.size).toEqual({ width: 300, height: 150 });
    
    // Verify safeWriteJSON was called twice (once for layout, once for content)
    expect(safeWriteJSON).toHaveBeenCalledTimes(2);
  });
  
  test('createSticker handles invalid input', async () => {
    // Create a new sticker with invalid values
    const invalidSticker = null;
    
    const result = await stickerManager.createSticker(invalidSticker);
    
    // Verify result
    expect(result.success).toBe(true); // Should still succeed with default values
    expect(result.sticker).toBeDefined();
    expect(result.sticker.content).toBe('');
  });
  
  test('createSticker sanitizes input values', async () => {
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Create a new sticker with values that need sanitization
    const unsanitizedSticker = {
      content: '<script>alert("XSS")</script>',
      position: { x: 'not-a-number', y: -1000 }, // Invalid x, out-of-bounds y
      size: { width: 10000, height: 'invalid' } // Out-of-bounds width, invalid height
    };
    
    // Mock stripHtml to simulate sanitization
    stickerManager.stripHtml = jest.fn().mockResolvedValue('alert("XSS")');
    
    const result = await stickerManager.createSticker(unsanitizedSticker);
    
    // Verify result
    expect(result.success).toBe(true);
    expect(result.sticker).toBeDefined();
    expect(result.sticker.content).toBe('alert("XSS")'); // Sanitized content
    expect(result.sticker.position.x).toBe(0); // Default for invalid value
    expect(result.sticker.position.y).toBe(-1000); // Valid negative value
    expect(result.sticker.size.width).toBe(10000); // Large but valid
    expect(result.sticker.size.height).toBe(80); // Default for invalid value
    
    // Verify stripHtml was called
    expect(stickerManager.stripHtml).toHaveBeenCalledWith('<script>alert("XSS")</script>');
  });
  
  test('createSticker handles write failures', async () => {
    // Mock safeWriteJSON to fail
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(false);
    
    // Create a new sticker
    const result = await stickerManager.createSticker();
    
    // Verify result
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    
    // Verify displayError was called
    const { displayError } = require('../../ui/errorDisplay.js');
    expect(displayError).toHaveBeenCalled();
  });
  
  test('updateSticker updates an existing sticker', async () => {
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
            content: 'Original content'
          }
        ]);
      }
    });
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Update the sticker
    const updatedSticker = {
      id: 'existing-sticker',
      content: 'Updated content',
      position: { x: 100, y: 200 },
      size: { width: 300, height: 150 }
    };
    
    const result = await stickerManager.updateSticker(updatedSticker);
    
    // Verify result
    expect(result.success).toBe(true);
    
    // Verify safeWriteJSON was called twice (once for layout, once for content)
    expect(safeWriteJSON).toHaveBeenCalledTimes(2);
    
    // Check that the correct data was written
    const layoutCall = safeWriteJSON.mock.calls[0][1];
    const contentCall = safeWriteJSON.mock.calls[1][1];
    
    expect(layoutCall).toEqual([
      {
        id: 'existing-sticker',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 150 }
      }
    ]);
    
    expect(contentCall).toEqual([
      {
        id: 'existing-sticker',
        content: 'Updated content'
      }
    ]);
  });
  
  test('removeSticker removes an existing sticker', async () => {
    // Mock existing stickers
    const { safeReadJSON } = require('../../utils/jsonUtils.js');
    safeReadJSON.mockImplementation((filePath) => {
      if (filePath.includes('layout')) {
        return Promise.resolve([
          {
            id: 'sticker-to-remove',
            position: { x: 0, y: 0 },
            size: { width: 250, height: 80 }
          },
          {
            id: 'sticker-to-keep',
            position: { x: 100, y: 200 },
            size: { width: 300, height: 150 }
          }
        ]);
      } else {
        return Promise.resolve([
          {
            id: 'sticker-to-remove',
            content: 'Content to remove'
          },
          {
            id: 'sticker-to-keep',
            content: 'Content to keep'
          }
        ]);
      }
    });
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Remove the sticker
    const result = await stickerManager.removeSticker('sticker-to-remove');
    
    // Verify result
    expect(result.success).toBe(true);
    
    // Verify safeWriteJSON was called twice (once for layout, once for content)
    expect(safeWriteJSON).toHaveBeenCalledTimes(2);
    
    // Check that the correct data was written
    const layoutCall = safeWriteJSON.mock.calls[0][1];
    const contentCall = safeWriteJSON.mock.calls[1][1];
    
    // Should only contain the sticker-to-keep
    expect(layoutCall).toEqual([
      {
        id: 'sticker-to-keep',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 150 }
      }
    ]);
    
    expect(contentCall).toEqual([
      {
        id: 'sticker-to-keep',
        content: 'Content to keep'
      }
    ]);
  });
});
