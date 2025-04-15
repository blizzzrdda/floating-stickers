/**
 * Tests for content management functionality
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import StickerDataManager from '../../utils/stickerUtils.js';
import {
  createTempTestDir,
  cleanupTempTestDir,
  createMockLayoutData,
  createMockContentData
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

describe('Content Management', () => {
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
  
  test('loadLayoutData loads layout data from file', async () => {
    // Mock file exists
    fs.existsSync.mockReturnValue(true);
    
    // Mock layout data
    const mockLayoutData = createMockLayoutData(2);
    
    // Mock loadArrayContent to return mock data
    const { loadArrayContent } = require('../../utils/contentLoader.js');
    loadArrayContent.mockResolvedValue({
      content: mockLayoutData,
      source: 'file'
    });
    
    // Load layout data
    const result = await stickerManager.loadLayoutData();
    
    // Verify result
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('sticker-1');
    expect(result[1].id).toBe('sticker-2');
    
    // Verify loadArrayContent was called with correct parameters
    expect(loadArrayContent).toHaveBeenCalledWith(
      stickerManager.layoutFilePath,
      [],
      expect.objectContaining({
        validator: expect.any(Function),
        operationKey: 'loadLayoutData'
      })
    );
  });
  
  test('loadContentData loads content data from file', async () => {
    // Mock file exists
    fs.existsSync.mockReturnValue(true);
    
    // Mock content data
    const mockContentData = createMockContentData(2);
    
    // Mock loadArrayContent to return mock data
    const { loadArrayContent } = require('../../utils/contentLoader.js');
    loadArrayContent.mockResolvedValue({
      content: mockContentData,
      source: 'file'
    });
    
    // Load content data
    const result = await stickerManager.loadContentData();
    
    // Verify result
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('sticker-1');
    expect(result[0].content).toBe('Test content for sticker 1');
    expect(result[1].id).toBe('sticker-2');
    expect(result[1].content).toBe('Test content for sticker 2');
    
    // Verify loadArrayContent was called with correct parameters
    expect(loadArrayContent).toHaveBeenCalledWith(
      stickerManager.contentFilePath,
      [],
      expect.objectContaining({
        validator: expect.any(Function),
        operationKey: 'loadContentData'
      })
    );
  });
  
  test('loadStickerData merges layout and content data', async () => {
    // Mock checkAndMigrateData
    stickerManager.checkAndMigrateData = jest.fn().mockResolvedValue({
      success: true,
      migrated: false
    });
    
    // Mock files exist
    fs.existsSync.mockReturnValue(true);
    
    // Mock layout and content data
    const mockLayoutData = createMockLayoutData(2);
    const mockContentData = createMockContentData(2);
    
    // Mock loadArrayContentWithFeedback to return mock data
    const { loadArrayContentWithFeedback } = require('../../utils/contentLoader.js');
    loadArrayContentWithFeedback.mockImplementation((filePath) => {
      if (filePath.includes('layout')) {
        return Promise.resolve({
          content: mockLayoutData,
          source: 'file'
        });
      } else {
        return Promise.resolve({
          content: mockContentData,
          source: 'file'
        });
      }
    });
    
    // Load merged sticker data
    const result = await stickerManager.loadStickerData();
    
    // Verify result
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    
    // Check first sticker
    expect(result[0].id).toBe('sticker-1');
    expect(result[0].content).toBe('Test content for sticker 1');
    expect(result[0].position).toEqual({ x: 100, y: 200 });
    expect(result[0].size).toEqual({ width: 250, height: 80 });
    
    // Check second sticker
    expect(result[1].id).toBe('sticker-2');
    expect(result[1].content).toBe('Test content for sticker 2');
    expect(result[1].position).toEqual({ x: 200, y: 400 });
    expect(result[1].size).toEqual({ width: 250, height: 80 });
    
    // Verify loadArrayContentWithFeedback was called twice
    expect(loadArrayContentWithFeedback).toHaveBeenCalledTimes(2);
  });
  
  test('loadStickerData handles missing content for a layout', async () => {
    // Mock checkAndMigrateData
    stickerManager.checkAndMigrateData = jest.fn().mockResolvedValue({
      success: true,
      migrated: false
    });
    
    // Mock files exist
    fs.existsSync.mockReturnValue(true);
    
    // Mock layout data with two stickers but content data with only one
    const mockLayoutData = createMockLayoutData(2);
    const mockContentData = createMockContentData(1);
    
    // Mock loadArrayContentWithFeedback to return mock data
    const { loadArrayContentWithFeedback } = require('../../utils/contentLoader.js');
    loadArrayContentWithFeedback.mockImplementation((filePath) => {
      if (filePath.includes('layout')) {
        return Promise.resolve({
          content: mockLayoutData,
          source: 'file'
        });
      } else {
        return Promise.resolve({
          content: mockContentData,
          source: 'file'
        });
      }
    });
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Load merged sticker data
    const result = await stickerManager.loadStickerData();
    
    // Verify result
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    
    // Check first sticker (has content)
    expect(result[0].id).toBe('sticker-1');
    expect(result[0].content).toBe('Test content for sticker 1');
    
    // Check second sticker (missing content, should have empty string)
    expect(result[1].id).toBe('sticker-2');
    expect(result[1].content).toBe('');
    
    // Verify safeWriteJSON was called to create missing content
    expect(safeWriteJSON).toHaveBeenCalled();
  });
  
  test('saveLayoutData saves layout data to file', async () => {
    // Mock layout data
    const mockLayoutData = createMockLayoutData(2);
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Save layout data
    const result = await stickerManager.saveLayoutData(mockLayoutData);
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify safeWriteJSON was called with correct parameters
    expect(safeWriteJSON).toHaveBeenCalledWith(
      stickerManager.layoutFilePath,
      mockLayoutData
    );
  });
  
  test('saveContentData saves content data to file', async () => {
    // Mock content data
    const mockContentData = createMockContentData(2);
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Save content data
    const result = await stickerManager.saveContentData(mockContentData);
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify safeWriteJSON was called with correct parameters
    expect(safeWriteJSON).toHaveBeenCalledWith(
      stickerManager.contentFilePath,
      mockContentData
    );
  });
  
  test('saveContentData filters out invalid items', async () => {
    // Mock content data with some invalid items
    const mockContentData = [
      { id: 'valid-1', content: 'Valid content 1' },
      { id: '', content: 'Invalid: empty ID' }, // Invalid: empty ID
      { id: 'valid-2', content: 'Valid content 2' },
      { content: 'Invalid: missing ID' }, // Invalid: missing ID
      { id: 'valid-3', content: 123 }, // Invalid: content is not a string
      null, // Invalid: null item
      { id: 'valid-4', content: 'Valid content 4' }
    ];
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Save content data
    const result = await stickerManager.saveContentData(mockContentData);
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify safeWriteJSON was called with filtered data
    expect(safeWriteJSON).toHaveBeenCalled();
    
    // Get the data that was passed to safeWriteJSON
    const savedData = safeWriteJSON.mock.calls[0][1];
    
    // Should only contain valid items
    expect(savedData.length).toBe(3);
    expect(savedData[0].id).toBe('valid-1');
    expect(savedData[1].id).toBe('valid-2');
    expect(savedData[2].id).toBe('valid-4');
  });
  
  test('updateStickerContent updates content for a specific sticker', async () => {
    // Mock existing content data
    const mockContentData = [
      { id: 'sticker-1', content: 'Original content 1' },
      { id: 'sticker-2', content: 'Original content 2' }
    ];
    
    // Mock loadContentData to return mock data
    stickerManager.loadContentData = jest.fn().mockResolvedValue(mockContentData);
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Update content for sticker-1
    const result = await stickerManager.updateStickerContent('sticker-1', 'Updated content');
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify loadContentData was called
    expect(stickerManager.loadContentData).toHaveBeenCalled();
    
    // Verify safeWriteJSON was called with updated data
    expect(safeWriteJSON).toHaveBeenCalled();
    
    // Get the data that was passed to safeWriteJSON
    const savedData = safeWriteJSON.mock.calls[0][1];
    
    // Should contain updated content for sticker-1
    expect(savedData.length).toBe(2);
    expect(savedData[0].id).toBe('sticker-1');
    expect(savedData[0].content).toBe('Updated content');
    expect(savedData[1].id).toBe('sticker-2');
    expect(savedData[1].content).toBe('Original content 2');
  });
  
  test('updateStickerContent adds a new content entry if it doesn\'t exist', async () => {
    // Mock existing content data without the target sticker
    const mockContentData = [
      { id: 'sticker-1', content: 'Content 1' }
    ];
    
    // Mock loadContentData to return mock data
    stickerManager.loadContentData = jest.fn().mockResolvedValue(mockContentData);
    
    // Mock safeWriteJSON to succeed
    const { safeWriteJSON } = require('../../utils/jsonUtils.js');
    safeWriteJSON.mockResolvedValue(true);
    
    // Update content for non-existent sticker
    const result = await stickerManager.updateStickerContent('new-sticker', 'New content');
    
    // Verify result
    expect(result).toBe(true);
    
    // Verify safeWriteJSON was called with updated data
    expect(safeWriteJSON).toHaveBeenCalled();
    
    // Get the data that was passed to safeWriteJSON
    const savedData = safeWriteJSON.mock.calls[0][1];
    
    // Should contain the original sticker and the new one
    expect(savedData.length).toBe(2);
    expect(savedData[0].id).toBe('sticker-1');
    expect(savedData[0].content).toBe('Content 1');
    expect(savedData[1].id).toBe('new-sticker');
    expect(savedData[1].content).toBe('New content');
  });
  
  test('sanitizeContent removes HTML tags from content', async () => {
    // Mock stripHtml to simulate sanitization
    stickerManager.stripHtml = jest.fn().mockImplementation(content => {
      // Simple HTML tag removal for testing
      return content.replace(/<[^>]*>/g, '');
    });
    
    // Test with HTML content
    const htmlContent = '<div>Test <b>content</b> with <script>alert("XSS")</script></div>';
    const sanitized = await stickerManager.sanitizeContent(htmlContent);
    
    // Verify result
    expect(sanitized).toBe('Test content with alert("XSS")');
    
    // Verify stripHtml was called
    expect(stickerManager.stripHtml).toHaveBeenCalledWith(htmlContent);
  });
  
  test('sanitizeContent handles non-string input', async () => {
    // Test with non-string inputs
    expect(await stickerManager.sanitizeContent(null)).toBe('');
    expect(await stickerManager.sanitizeContent(undefined)).toBe('');
    expect(await stickerManager.sanitizeContent(123)).toBe('');
    expect(await stickerManager.sanitizeContent({})).toBe('');
    expect(await stickerManager.sanitizeContent([])).toBe('');
  });
});
