/**
 * File Utilities
 * Common file operations used throughout the application
 */

import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';

// Create a logger for file operations
const logger = new Logger({ category: 'FileUtils' });

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<boolean>} - Success status
 */
async function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      logger.debug(`Creating directory: ${dirPath}`);
      await fs.promises.mkdir(dirPath, { recursive: true });
      logger.debug(`Directory created: ${dirPath}`);
    }
    return true;
  } catch (err) {
    logger.error(`Error creating directory ${dirPath}:`, err);
    return false;
  }
}

/**
 * Create a backup of a file
 * @param {string} filePath - Path to the file
 * @param {string} reason - Reason for backup (used in filename)
 * @returns {Promise<string|null>} - Path to backup file or null if failed
 */
async function createFileBackup(filePath, reason = 'backup') {
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`Cannot backup non-existent file: ${filePath}`);
      return null;
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupPath = `${filePath}.${reason}-${timestamp}`;
    
    logger.debug(`Creating backup of ${filePath} at ${backupPath}`);
    await fs.promises.copyFile(filePath, backupPath);
    logger.debug(`Backup created: ${backupPath}`);
    
    return backupPath;
  } catch (err) {
    logger.error(`Error creating backup of ${filePath}:`, err);
    return null;
  }
}

/**
 * Safely delete a file if it exists
 * @param {string} filePath - Path to the file
 * @param {boolean} createBackup - Whether to create a backup before deletion
 * @returns {Promise<boolean>} - Success status
 */
async function safeDeleteFile(filePath, createBackup = true) {
  try {
    if (!fs.existsSync(filePath)) {
      logger.debug(`File doesn't exist, nothing to delete: ${filePath}`);
      return true;
    }
    
    // Create backup before deletion if requested
    if (createBackup) {
      await createFileBackup(filePath, 'pre-delete');
    }
    
    logger.debug(`Deleting file: ${filePath}`);
    await fs.promises.unlink(filePath);
    logger.debug(`File deleted: ${filePath}`);
    
    return true;
  } catch (err) {
    logger.error(`Error deleting file ${filePath}:`, err);
    return false;
  }
}

/**
 * Check if a file is empty
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} - True if file is empty or doesn't exist
 */
async function isFileEmpty(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return true;
    }
    
    const stats = await fs.promises.stat(filePath);
    return stats.size === 0;
  } catch (err) {
    logger.error(`Error checking if file is empty ${filePath}:`, err);
    return true; // Assume empty on error
  }
}

/**
 * Read a file with error handling
 * @param {string} filePath - Path to the file
 * @param {string} encoding - File encoding (default: utf8)
 * @returns {Promise<string|null>} - File content or null if failed
 */
async function safeReadFile(filePath, encoding = 'utf8') {
  try {
    if (!fs.existsSync(filePath)) {
      logger.debug(`File doesn't exist: ${filePath}`);
      return null;
    }
    
    logger.debug(`Reading file: ${filePath}`);
    const content = await fs.promises.readFile(filePath, encoding);
    return content;
  } catch (err) {
    logger.error(`Error reading file ${filePath}:`, err);
    return null;
  }
}

/**
 * Write to a file with error handling
 * @param {string} filePath - Path to the file
 * @param {string|Buffer} content - Content to write
 * @param {Object} options - Write options
 * @returns {Promise<boolean>} - Success status
 */
async function safeWriteFile(filePath, content, options = {}) {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    await ensureDirectoryExists(dir);
    
    // Create backup if requested and file exists
    if (options.createBackup && fs.existsSync(filePath)) {
      await createFileBackup(filePath, options.backupReason || 'pre-write');
    }
    
    logger.debug(`Writing to file: ${filePath}`);
    await fs.promises.writeFile(filePath, content, options);
    logger.debug(`File written: ${filePath}`);
    
    return true;
  } catch (err) {
    logger.error(`Error writing to file ${filePath}:`, err);
    return false;
  }
}

/**
 * Append to a file with error handling
 * @param {string} filePath - Path to the file
 * @param {string|Buffer} content - Content to append
 * @param {Object} options - Append options
 * @returns {Promise<boolean>} - Success status
 */
async function safeAppendFile(filePath, content, options = {}) {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    await ensureDirectoryExists(dir);
    
    logger.debug(`Appending to file: ${filePath}`);
    await fs.promises.appendFile(filePath, content, options);
    logger.debug(`Content appended to file: ${filePath}`);
    
    return true;
  } catch (err) {
    logger.error(`Error appending to file ${filePath}:`, err);
    return false;
  }
}

/**
 * Get all files in a directory
 * @param {string} dirPath - Path to the directory
 * @param {Object} options - Options
 * @param {boolean} options.recursive - Whether to search recursively
 * @param {RegExp} options.filter - Regex to filter files
 * @returns {Promise<string[]>} - Array of file paths
 */
async function getFilesInDirectory(dirPath, options = {}) {
  try {
    if (!fs.existsSync(dirPath)) {
      logger.debug(`Directory doesn't exist: ${dirPath}`);
      return [];
    }
    
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    let files = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && options.recursive) {
        const subFiles = await getFilesInDirectory(fullPath, options);
        files = files.concat(subFiles);
      } else if (entry.isFile()) {
        if (!options.filter || options.filter.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  } catch (err) {
    logger.error(`Error getting files in directory ${dirPath}:`, err);
    return [];
  }
}

export {
  ensureDirectoryExists,
  createFileBackup,
  safeDeleteFile,
  isFileEmpty,
  safeReadFile,
  safeWriteFile,
  safeAppendFile,
  getFilesInDirectory
};
