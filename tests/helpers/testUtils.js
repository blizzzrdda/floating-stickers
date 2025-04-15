/**
 * Test Utilities
 * Common helper functions and utilities for testing
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Create a temporary test directory
 * @returns {string} Path to the temporary directory
 */
function createTempTestDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sticker-test-'));
}

/**
 * Clean up a temporary test directory
 * @param {string} dirPath - Path to the directory to clean up
 */
function cleanupTempTestDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          cleanupTempTestDir(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      fs.rmdirSync(dirPath);
    }
  } catch (error) {
    console.error(`Error cleaning up test directory ${dirPath}:`, error);
  }
}

/**
 * Create a test file with the given content
 * @param {string} dirPath - Directory to create the file in
 * @param {string} fileName - Name of the file
 * @param {any} content - Content to write to the file (will be JSON.stringified)
 * @returns {string} Path to the created file
 */
function createTestFile(dirPath, fileName, content) {
  const filePath = path.join(dirPath, fileName);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  return filePath;
}

/**
 * Read a test file
 * @param {string} filePath - Path to the file to read
 * @returns {any} Parsed content of the file
 */
function readTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Create a mock sticker data object
 * @param {string} id - Sticker ID
 * @param {string} content - Sticker content
 * @param {Object} position - Sticker position
 * @param {Object} size - Sticker size
 * @returns {Object} Mock sticker data
 */
function createMockSticker(
  id = Date.now().toString(),
  content = 'Test content',
  position = { x: 100, y: 200 },
  size = { width: 250, height: 80 }
) {
  return {
    id,
    content,
    position,
    size
  };
}

/**
 * Create mock layout data
 * @param {number} count - Number of stickers to create
 * @returns {Array} Array of mock layout data
 */
function createMockLayoutData(count = 1) {
  return Array.from({ length: count }, (_, i) => ({
    id: `sticker-${i + 1}`,
    position: { x: 100 * (i + 1), y: 200 * (i + 1) },
    size: { width: 250, height: 80 }
  }));
}

/**
 * Create mock content data
 * @param {number} count - Number of stickers to create
 * @returns {Array} Array of mock content data
 */
function createMockContentData(count = 1) {
  return Array.from({ length: count }, (_, i) => ({
    id: `sticker-${i + 1}`,
    content: `Test content for sticker ${i + 1}`
  }));
}

/**
 * Create a mock logger that captures logs
 * @returns {Object} Mock logger
 */
function createMockLogger() {
  const logs = {
    debug: [],
    info: [],
    warn: [],
    error: []
  };

  return {
    debug: jest.fn((...args) => logs.debug.push(args)),
    info: jest.fn((...args) => logs.info.push(args)),
    warn: jest.fn((...args) => logs.warn.push(args)),
    error: jest.fn((...args) => logs.error.push(args)),
    logs
  };
}

export {
  createTempTestDir,
  cleanupTempTestDir,
  createTestFile,
  readTestFile,
  createMockSticker,
  createMockLayoutData,
  createMockContentData,
  createMockLogger
};
