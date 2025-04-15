/**
 * Tests for the Data Migration utility
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  migrateData,
  createBackups,
  extractValidStickers,
  addVersionInfo
} from '../../utils/dataMigration.js';
import { DATA_VERSIONS } from '../../utils/versionDetection.js';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

// Mock jsonUtils module
jest.mock('../../utils/jsonUtils.js', () => ({
  safeReadJSON: jest.fn(),
  safeWriteJSON: jest.fn(),
  backupJSONFile: jest.fn()
}));

// Mock versionDetection module
jest.mock('../../utils/versionDetection.js', () => ({
  detectDataVersion: jest.fn(),
  DATA_VERSIONS: {
    UNKNOWN: 'unknown',
    V1: 'v1',
    V2: 'v2'
  }
}));

// Mock errorHandler module
jest.mock('../../utils/errorHandler.js', () => ({
  ERROR_CATEGORIES: {
    UNKNOWN: 'UNKNOWN'
  }
}));

// Mock errorDisplay module
jest.mock('../../ui/errorDisplay.js', () => ({
  displayInfo: jest.fn(),
  displayWarning: jest.fn(),
  displayError: jest.fn()
}));

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('Data Migration Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('migrateData returns early if no migration is needed', async () => {
    // Mock version detection to return V1 (no migration needed)
    const { detectDataVersion } = require('../../utils/versionDetection.js');
    detectDataVersion.mockResolvedValue({
      version: DATA_VERSIONS.V1,
      layoutExists: true,
      contentExists: true,
      needsMigration: false
    });
    
    const result = await migrateData('layout.json', 'content.json');
    
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(false);
  });
  
  test('migrateData creates backups before migration', async () => {
    // Mock version detection to return UNKNOWN (migration needed)
    const { detectDataVersion } = require('../../utils/versionDetection.js');
    detectDataVersion.mockResolvedValue({
      version: DATA_VERSIONS.UNKNOWN,
      layoutExists: true,
      contentExists: true,
      layoutData: [],
      contentData: [],
      needsMigration: true
    });
    
    // Mock file existence
    fs.existsSync.mockReturnValue(true);
    
    // Mock backup creation
    const { backupJSONFile } = require('../../utils/jsonUtils.js');
    backupJSONFile.mockResolvedValue('backup-file.json');
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    await migrateData('layout.json', 'content.json', { createBackup: true });
    
    // Should have called backupJSONFile twice (once for layout, once for content)
    expect(backupJSONFile).toHaveBeenCalledTimes(2);
  });
  
  test('migrateData handles unknown format correctly', async () => {
    // Mock version detection to return UNKNOWN (migration needed)
    const { detectDataVersion } = require('../../utils/versionDetection.js');
    detectDataVersion.mockResolvedValue({
      version: DATA_VERSIONS.UNKNOWN,
      layoutExists: true,
      contentExists: true,
      layoutData: [
        {
          id: '1',
          position: { x: 100, y: 200 },
          size: { width: 250, height: 80 }
        }
      ],
      contentData: [
        {
          id: '1',
          content: 'Test content'
        }
      ],
      needsMigration: true
    });
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    const result = await migrateData('layout.json', 'content.json');
    
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.stickersExtracted).toBe(1);
    
    // Should have called safeWriteJSON twice (once for layout, once for content)
    expect(safeWriteJSON).toHaveBeenCalledTimes(2);
  });
  
  test('migrateData handles errors during migration', async () => {
    // Mock version detection to return UNKNOWN (migration needed)
    const { detectDataVersion } = require('../../utils/versionDetection.js');
    detectDataVersion.mockResolvedValue({
      version: DATA_VERSIONS.UNKNOWN,
      layoutExists: true,
      contentExists: true,
      layoutData: [],
      contentData: [],
      needsMigration: true
    });
    
    // Mock safeWriteJSON to fail
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockRejectedValue(new Error('Test error'));
    
    const result = await migrateData('layout.json', 'content.json');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
  
  test('createBackups handles existing files', async () => {
    // Mock file existence
    fs.existsSync.mockReturnValue(true);
    
    // Mock backup creation
    const { backupJSONFile } = require('../../utils/jsonUtils.js');
    backupJSONFile.mockResolvedValue('backup-file.json');
    
    const result = await createBackups('layout.json', 'content.json');
    
    expect(result.layout).toBe('backup-file.json');
    expect(result.content).toBe('backup-file.json');
    expect(backupJSONFile).toHaveBeenCalledTimes(2);
  });
  
  test('createBackups handles non-existent files', async () => {
    // Mock file non-existence
    fs.existsSync.mockReturnValue(false);
    
    const result = await createBackups('layout.json', 'content.json');
    
    expect(result.layout).toBeNull();
    expect(result.content).toBeNull();
    
    // Should not have called backupJSONFile
    const { backupJSONFile } = require('../../utils/jsonUtils.js');
    expect(backupJSONFile).not.toHaveBeenCalled();
  });
  
  test('extractValidStickers handles array format correctly', () => {
    // Valid layout data
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      },
      {
        id: '2',
        position: { x: 300, y: 400 },
        size: { width: 300, height: 100 }
      }
    ];
    
    // Valid content data
    const contentData = [
      {
        id: '1',
        content: 'Content for sticker 1'
      },
      {
        id: '2',
        content: 'Content for sticker 2'
      }
    ];
    
    const result = extractValidStickers(layoutData, contentData);
    
    expect(result.stickers.length).toBe(2);
    expect(result.stickers[0].id).toBe('1');
    expect(result.stickers[0].content).toBe('Content for sticker 1');
    expect(result.stickers[1].id).toBe('2');
    expect(result.stickers[1].content).toBe('Content for sticker 2');
  });
  
  test('extractValidStickers handles object map format correctly', () => {
    // Layout data as object map
    const layoutData = {
      '1': {
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      },
      '2': {
        position: { x: 300, y: 400 },
        size: { width: 300, height: 100 }
      }
    };
    
    // Content data as object map
    const contentData = {
      '1': 'Content for sticker 1',
      '2': 'Content for sticker 2'
    };
    
    const result = extractValidStickers(layoutData, contentData);
    
    expect(result.stickers.length).toBe(2);
    expect(result.stickers[0].id).toBe('1');
    expect(result.stickers[0].content).toBe('Content for sticker 1');
    expect(result.stickers[1].id).toBe('2');
    expect(result.stickers[1].content).toBe('Content for sticker 2');
  });
  
  test('extractValidStickers handles missing content', () => {
    // Layout data with two stickers
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      },
      {
        id: '2',
        position: { x: 300, y: 400 },
        size: { width: 300, height: 100 }
      }
    ];
    
    // Content data with only one sticker
    const contentData = [
      {
        id: '1',
        content: 'Content for sticker 1'
      }
    ];
    
    const result = extractValidStickers(layoutData, contentData);
    
    expect(result.stickers.length).toBe(2);
    expect(result.stickers[0].id).toBe('1');
    expect(result.stickers[0].content).toBe('Content for sticker 1');
    expect(result.stickers[1].id).toBe('2');
    expect(result.stickers[1].content).toBe(''); // Empty content for missing sticker
  });
  
  test('extractValidStickers handles invalid data', () => {
    // Invalid layout data (not an array or object)
    const layoutData = 'not an array or object';
    
    // Invalid content data (not an array or object)
    const contentData = 123;
    
    const result = extractValidStickers(layoutData, contentData);
    
    expect(result.stickers.length).toBe(0);
  });
  
  test('addVersionInfo adds version information to data files', async () => {
    // Mock safeReadJSON to return valid data
    const { safeReadJSON } = require('../../utils/jsonUtils.js');
    safeReadJSON.mockImplementation((filePath) => {
      if (filePath.includes('layout')) {
        return Promise.resolve([
          {
            id: '1',
            position: { x: 100, y: 200 },
            size: { width: 250, height: 80 }
          }
        ]);
      } else {
        return Promise.resolve([
          {
            id: '1',
            content: 'Test content'
          }
        ]);
      }
    });
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    const result = await addVersionInfo('layout.json', 'content.json', DATA_VERSIONS.V1);
    
    expect(result.success).toBe(true);
    expect(result.version).toBe(DATA_VERSIONS.V1);
    
    // Should have called safeWriteJSON twice (once for layout, once for content)
    expect(safeWriteJSON).toHaveBeenCalledTimes(2);
    
    // Check that version information was added
    const layoutCall = safeWriteJSON.mock.calls[0][1];
    const contentCall = safeWriteJSON.mock.calls[1][1];
    
    expect(layoutCall.__version).toBe(DATA_VERSIONS.V1);
    expect(contentCall.__version).toBe(DATA_VERSIONS.V1);
  });
  
  test('addVersionInfo handles errors', async () => {
    // Mock safeReadJSON to fail
    const { safeReadJSON } = require('../../utils/jsonUtils.js');
    safeReadJSON.mockRejectedValue(new Error('Test error'));
    
    const result = await addVersionInfo('layout.json', 'content.json');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
