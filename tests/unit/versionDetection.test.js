/**
 * Tests for the Version Detection utility
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  detectDataVersion,
  determineVersion,
  isV1Format,
  needsMigration,
  DATA_VERSIONS
} from '../../utils/versionDetection.js';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

// Mock jsonUtils module
jest.mock('../../utils/jsonUtils.js', () => ({
  safeReadJSON: jest.fn()
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

describe('Version Detection Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('determineVersion identifies V1 format correctly', () => {
    // Valid V1 layout data
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      }
    ];
    
    // Valid V1 content data
    const contentData = [
      {
        id: '1',
        content: 'Test content'
      }
    ];
    
    expect(determineVersion(layoutData, contentData)).toBe(DATA_VERSIONS.V1);
  });
  
  test('determineVersion handles null data correctly', () => {
    expect(determineVersion(null, null)).toBe(DATA_VERSIONS.V1);
  });
  
  test('determineVersion identifies future versions with explicit version field', () => {
    // Layout data with version field
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      }
    ];
    layoutData.__version = 'v2';
    
    expect(determineVersion(layoutData, [])).toBe('v2');
    
    // Content data with version field
    const contentData = [
      {
        id: '1',
        content: 'Test content'
      }
    ];
    contentData.__version = 'v3';
    
    expect(determineVersion([], contentData)).toBe('v3');
  });
  
  test('determineVersion returns UNKNOWN for invalid data', () => {
    // Invalid layout data (not an array)
    const invalidLayoutData = { notAnArray: true };
    
    // Valid content data
    const contentData = [
      {
        id: '1',
        content: 'Test content'
      }
    ];
    
    expect(determineVersion(invalidLayoutData, contentData)).toBe(DATA_VERSIONS.UNKNOWN);
  });
  
  test('isV1Format validates correct V1 format', () => {
    // Valid V1 layout data
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      }
    ];
    
    // Valid V1 content data
    const contentData = [
      {
        id: '1',
        content: 'Test content'
      }
    ];
    
    expect(isV1Format(layoutData, contentData)).toBe(true);
  });
  
  test('isV1Format rejects invalid layout data', () => {
    // Invalid layout data (missing position)
    const invalidLayoutData = [
      {
        id: '1',
        size: { width: 250, height: 80 }
      }
    ];
    
    // Valid content data
    const contentData = [
      {
        id: '1',
        content: 'Test content'
      }
    ];
    
    expect(isV1Format(invalidLayoutData, contentData)).toBe(false);
  });
  
  test('isV1Format rejects invalid content data', () => {
    // Valid layout data
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      }
    ];
    
    // Invalid content data (content is not a string)
    const invalidContentData = [
      {
        id: '1',
        content: { notAString: true }
      }
    ];
    
    expect(isV1Format(layoutData, invalidContentData)).toBe(false);
  });
  
  test('isV1Format handles empty arrays', () => {
    expect(isV1Format([], [])).toBe(true);
  });
  
  test('isV1Format handles null values', () => {
    expect(isV1Format(null, null)).toBe(true);
  });
  
  test('needsMigration returns correct values', () => {
    expect(needsMigration(DATA_VERSIONS.V1)).toBe(false);
    expect(needsMigration(DATA_VERSIONS.UNKNOWN)).toBe(false);
    expect(needsMigration('v2')).toBe(true);
    expect(needsMigration('some-other-version')).toBe(true);
  });
  
  test('detectDataVersion handles non-existent files', async () => {
    // Mock files don't exist
    fs.existsSync.mockReturnValue(false);
    
    const result = await detectDataVersion('layout.json', 'content.json');
    
    expect(result.version).toBe(DATA_VERSIONS.V1);
    expect(result.layoutExists).toBe(false);
    expect(result.contentExists).toBe(false);
    expect(result.needsMigration).toBe(false);
  });
  
  test('detectDataVersion handles existing V1 files', async () => {
    // Mock files exist
    fs.existsSync.mockReturnValue(true);
    
    // Mock valid V1 data
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      }
    ];
    
    const contentData = [
      {
        id: '1',
        content: 'Test content'
      }
    ];
    
    const { safeReadJSON } = require('../../utils/jsonUtils.js');
    safeReadJSON.mockImplementation((filePath) => {
      if (filePath.includes('layout')) {
        return Promise.resolve(layoutData);
      } else {
        return Promise.resolve(contentData);
      }
    });
    
    const result = await detectDataVersion('layout.json', 'content.json');
    
    expect(result.version).toBe(DATA_VERSIONS.V1);
    expect(result.layoutExists).toBe(true);
    expect(result.contentExists).toBe(true);
    expect(result.needsMigration).toBe(false);
  });
  
  test('detectDataVersion handles errors', async () => {
    // Mock files exist
    fs.existsSync.mockReturnValue(true);
    
    // Mock error when reading files
    const { safeReadJSON } = require('../../utils/jsonUtils.js');
    safeReadJSON.mockRejectedValue(new Error('Test error'));
    
    const result = await detectDataVersion('layout.json', 'content.json');
    
    expect(result.version).toBe(DATA_VERSIONS.UNKNOWN);
    expect(result.error).toBeDefined();
  });
});
