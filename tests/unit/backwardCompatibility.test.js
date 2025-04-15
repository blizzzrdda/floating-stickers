/**
 * Tests for backward compatibility with existing sticker data
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import StickerDataManager from '../../utils/stickerUtils.js';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined)
  }
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

// Mock dataMigration module
jest.mock('../../utils/dataMigration.js', () => ({
  migrateData: jest.fn(),
  addVersionInfo: jest.fn()
}));

// Mock jsonUtils module
jest.mock('../../utils/jsonUtils.js', () => ({
  safeReadJSON: jest.fn(),
  safeWriteJSON: jest.fn(),
  backupJSONFile: jest.fn(),
  validateArrayData: jest.fn().mockReturnValue(true),
  validateJSONData: jest.fn().mockReturnValue(true)
}));

// Mock contentLoader module
jest.mock('../../utils/contentLoader.js', () => ({
  loadArrayContent: jest.fn(),
  loadArrayContentWithFeedback: jest.fn(),
  validateStickerContent: jest.fn().mockReturnValue(true),
  validateStickerLayout: jest.fn().mockReturnValue(true),
  validateStickerContentArray: jest.fn().mockReturnValue(true),
  validateStickerLayoutArray: jest.fn().mockReturnValue(true)
}));

// Mock errorDisplay module
jest.mock('../../ui/errorDisplay.js', () => ({
  displayInfo: jest.fn(),
  displayWarning: jest.fn(),
  displayError: jest.fn()
}));

describe('Backward Compatibility', () => {
  let testDir;
  let stickerManager;
  
  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = path.join(os.tmpdir(), 'sticker-test-');
    stickerManager = new StickerDataManager(testDir);
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  test('checkAndMigrateData handles non-existent files', async () => {
    // Mock files don't exist
    const { detectDataVersion } = require('../../utils/versionDetection.js');
    detectDataVersion.mockResolvedValue({
      version: 'v1',
      layoutExists: false,
      contentExists: false,
      needsMigration: false
    });
    
    const result = await stickerManager.checkAndMigrateData();
    
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(false);
    
    // Should not have called migrateData
    const { migrateData } = require('../../utils/dataMigration.js');
    expect(migrateData).not.toHaveBeenCalled();
  });
  
  test('checkAndMigrateData performs migration when needed', async () => {
    // Mock files exist but need migration
    const { detectDataVersion } = require('../../utils/versionDetection.js');
    detectDataVersion.mockResolvedValue({
      version: 'unknown',
      layoutExists: true,
      contentExists: true,
      needsMigration: true
    });
    
    // Mock migration success
    const { migrateData } = require('../../utils/dataMigration.js');
    migrateData.mockResolvedValue({
      success: true,
      migrated: true,
      message: 'Migration successful'
    });
    
    const result = await stickerManager.checkAndMigrateData({ showErrors: true });
    
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(true);
    
    // Should have called migrateData
    expect(migrateData).toHaveBeenCalledWith(
      stickerManager.layoutFilePath,
      stickerManager.contentFilePath,
      expect.objectContaining({
        showErrors: true,
        createBackup: true
      })
    );
    
    // Should have displayed info message
    const { displayInfo } = require('../../ui/errorDisplay.js');
    expect(displayInfo).toHaveBeenCalled();
  });
  
  test('checkAndMigrateData handles migration failure', async () => {
    // Mock files exist but need migration
    const { detectDataVersion } = require('../../utils/versionDetection.js');
    detectDataVersion.mockResolvedValue({
      version: 'unknown',
      layoutExists: true,
      contentExists: true,
      needsMigration: true
    });
    
    // Mock migration failure
    const { migrateData } = require('../../utils/dataMigration.js');
    migrateData.mockResolvedValue({
      success: false,
      migrated: false,
      error: 'Migration failed'
    });
    
    const result = await stickerManager.checkAndMigrateData({ showErrors: true });
    
    expect(result.success).toBe(false);
    
    // Should have displayed error message
    const { displayError } = require('../../ui/errorDisplay.js');
    expect(displayError).toHaveBeenCalled();
  });
  
  test('checkAndMigrateData adds version info to V1 data without version', async () => {
    // Mock files exist in V1 format but without version info
    const { detectDataVersion } = require('../../utils/versionDetection.js');
    detectDataVersion.mockResolvedValue({
      version: 'v1',
      layoutExists: true,
      contentExists: true,
      layoutData: [],
      contentData: [],
      needsMigration: false
    });
    
    // Mock addVersionInfo success
    const { addVersionInfo } = require('../../utils/dataMigration.js');
    addVersionInfo.mockResolvedValue({
      success: true,
      version: 'v1'
    });
    
    const result = await stickerManager.checkAndMigrateData();
    
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(false);
    
    // Should have called addVersionInfo
    expect(addVersionInfo).toHaveBeenCalledWith(
      stickerManager.layoutFilePath,
      stickerManager.contentFilePath,
      'v1'
    );
  });
  
  test('checkAndMigrateData handles errors', async () => {
    // Mock detectDataVersion to throw error
    const { detectDataVersion } = require('../../utils/versionDetection.js');
    detectDataVersion.mockRejectedValue(new Error('Test error'));
    
    const result = await stickerManager.checkAndMigrateData({ showErrors: true });
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error');
    
    // Should have displayed error message
    const { displayError } = require('../../ui/errorDisplay.js');
    expect(displayError).toHaveBeenCalled();
  });
  
  test('loadStickerData checks and migrates data before loading', async () => {
    // Mock checkAndMigrateData
    stickerManager.checkAndMigrateData = jest.fn().mockResolvedValue({
      success: true,
      migrated: true
    });
    
    // Mock files exist
    fs.existsSync.mockReturnValue(true);
    
    // Mock loadArrayContentWithFeedback
    const { loadArrayContentWithFeedback } = require('../../utils/contentLoader.js');
    loadArrayContentWithFeedback.mockImplementation((filePath) => {
      if (filePath.includes('layout')) {
        return Promise.resolve({
          content: [
            {
              id: '1',
              position: { x: 100, y: 200 },
              size: { width: 250, height: 80 }
            }
          ],
          source: 'file'
        });
      } else {
        return Promise.resolve({
          content: [
            {
              id: '1',
              content: 'Test content'
            }
          ],
          source: 'file'
        });
      }
    });
    
    const result = await stickerManager.loadStickerData({ showErrors: true });
    
    // Should have called checkAndMigrateData
    expect(stickerManager.checkAndMigrateData).toHaveBeenCalledWith({
      showErrors: true
    });
    
    // Should have loaded data
    expect(loadArrayContentWithFeedback).toHaveBeenCalledTimes(2);
    
    // Should have returned merged data
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('1');
    expect(result[0].content).toBe('Test content');
  });
});
