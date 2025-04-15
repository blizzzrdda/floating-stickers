import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  safeReadJSON, 
  safeWriteJSON, 
  safeDeleteJSON, 
  backupJSONFile,
  validateArrayData,
  validateJSONData
} from '../../utils/jsonUtils.js';

describe('JSON Utilities', () => {
  // Create a temporary test directory
  let testDir;
  
  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sticker-test-'));
  });
  
  afterEach(() => {
    // Clean up test files after each test
    try {
      if (fs.existsSync(testDir)) {
        const files = fs.readdirSync(testDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testDir, file));
        }
        fs.rmdirSync(testDir);
      }
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  });
  
  test('safeReadJSON returns default value for non-existent file', async () => {
    const filePath = path.join(testDir, 'non-existent.json');
    const defaultValue = { default: true };
    
    const result = await safeReadJSON(filePath, defaultValue);
    
    expect(result).toEqual(defaultValue);
  });
  
  test('safeReadJSON reads and parses valid JSON file', async () => {
    const filePath = path.join(testDir, 'valid.json');
    const testData = { test: 'data', number: 123 };
    
    // Write test data to file
    await fs.promises.writeFile(filePath, JSON.stringify(testData));
    
    const result = await safeReadJSON(filePath, {});
    
    expect(result).toEqual(testData);
  });
  
  test('safeReadJSON returns default value for empty file', async () => {
    const filePath = path.join(testDir, 'empty.json');
    const defaultValue = { default: true };
    
    // Create empty file
    await fs.promises.writeFile(filePath, '');
    
    const result = await safeReadJSON(filePath, defaultValue);
    
    expect(result).toEqual(defaultValue);
  });
  
  test('safeReadJSON returns default value for invalid JSON', async () => {
    const filePath = path.join(testDir, 'invalid.json');
    const defaultValue = { default: true };
    
    // Write invalid JSON to file
    await fs.promises.writeFile(filePath, '{ "invalid": "json"');
    
    const result = await safeReadJSON(filePath, defaultValue);
    
    expect(result).toEqual(defaultValue);
  });
  
  test('safeWriteJSON writes valid JSON to file', async () => {
    const filePath = path.join(testDir, 'write-test.json');
    const testData = { test: 'write', array: [1, 2, 3] };
    
    const writeResult = await safeWriteJSON(filePath, testData);
    expect(writeResult).toBe(true);
    
    // Verify file was written correctly
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    expect(parsedContent).toEqual(testData);
  });
  
  test('safeWriteJSON fails for invalid data', async () => {
    const filePath = path.join(testDir, 'invalid-write.json');
    
    // Create a circular reference
    const circularData = {};
    circularData.self = circularData;
    
    // This should fail because of the circular reference
    const writeResult = await safeWriteJSON(filePath, circularData);
    
    expect(writeResult).toBe(false);
    // File should not exist
    expect(fs.existsSync(filePath)).toBe(false);
  });
  
  test('safeDeleteJSON deletes existing file', async () => {
    const filePath = path.join(testDir, 'to-delete.json');
    
    // Create a file to delete
    await fs.promises.writeFile(filePath, '{}');
    
    const deleteResult = await safeDeleteJSON(filePath);
    
    expect(deleteResult).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
  });
  
  test('safeDeleteJSON returns false for non-existent file', async () => {
    const filePath = path.join(testDir, 'non-existent-delete.json');
    
    const deleteResult = await safeDeleteJSON(filePath);
    
    expect(deleteResult).toBe(false);
  });
  
  test('backupJSONFile creates a backup of existing file', async () => {
    const filePath = path.join(testDir, 'to-backup.json');
    const testData = { backup: 'test' };
    
    // Create a file to backup
    await fs.promises.writeFile(filePath, JSON.stringify(testData));
    
    const backupPath = await backupJSONFile(filePath, 'test-backup');
    
    expect(backupPath).not.toBeNull();
    expect(fs.existsSync(backupPath)).toBe(true);
    
    // Verify backup content
    const backupContent = await fs.promises.readFile(backupPath, 'utf8');
    const parsedBackup = JSON.parse(backupContent);
    
    expect(parsedBackup).toEqual(testData);
  });
  
  test('validateArrayData correctly identifies arrays', () => {
    expect(validateArrayData([])).toBe(true);
    expect(validateArrayData([1, 2, 3])).toBe(true);
    expect(validateArrayData({})).toBe(false);
    expect(validateArrayData(null)).toBe(false);
    expect(validateArrayData(undefined)).toBe(false);
    expect(validateArrayData('string')).toBe(false);
  });
  
  test('validateJSONData correctly identifies valid JSON objects', () => {
    expect(validateJSONData({})).toBe(true);
    expect(validateJSONData([])).toBe(true);
    expect(validateJSONData({ key: 'value' })).toBe(true);
    expect(validateJSONData(null)).toBe(true); // null is valid JSON
    expect(validateJSONData(undefined)).toBe(false);
    expect(validateJSONData('string')).toBe(false);
    expect(validateJSONData(123)).toBe(false);
  });
});
