import fs from 'fs';
import path from 'path';
import { debug, info, warn, error } from './debugUtils.js';

/**
 * Safely reads and parses a JSON file with comprehensive error handling
 * @param {string} filePath - Path to the JSON file
 * @param {any} defaultValue - Default value to return if file doesn't exist or is invalid
 * @returns {Promise<any>} - Parsed JSON data or default value
 */
async function safeReadJSON(filePath, defaultValue = {}) {
  const category = 'JsonUtils';
  debug(category, `Reading JSON file: ${filePath}`);

  try {
    if (!fs.existsSync(filePath)) {
      info(category, `File doesn't exist, will use default value: ${filePath}`);
      return defaultValue;
    }

    debug(category, `File exists, reading content: ${filePath}`);
    const data = await fs.promises.readFile(filePath, 'utf8');

    if (!data || data.trim() === '') {
      warn(category, `Empty file found: ${filePath}, will use default value`);
      return defaultValue;
    }

    debug(category, `File content length: ${data.length} bytes`);

    try {
      debug(category, `Attempting to parse JSON from: ${filePath}`);
      const parsed = JSON.parse(data);

      // Log the structure of the parsed data
      if (Array.isArray(parsed)) {
        debug(category, `Successfully parsed JSON array with ${parsed.length} items`);
        if (parsed.length > 0) {
          debug(category, `First item sample:`, parsed[0]);
        }
      } else {
        debug(category, `Successfully parsed JSON object with ${Object.keys(parsed).length} keys`);
      }

      return parsed;
    } catch (parseError) {
      error(category, `Error parsing JSON from ${filePath}:`, parseError);
      error(category, `Raw data that failed to parse (first 100 chars): ${data.substring(0, 100)}...`);

      // Create backup of corrupted file
      try {
        const backupPath = `${filePath}.corrupt-${Date.now()}`;
        await fs.promises.writeFile(backupPath, data);
        info(category, `Created backup of corrupted file at ${backupPath}`);
      } catch (backupError) {
        error(category, `Failed to create backup of corrupted file:`, backupError);
      }

      // Try to delete and recreate the file
      try {
        await fs.promises.unlink(filePath);
        await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
        info(category, `Recreated ${filePath} with default values`);
      } catch (recreateError) {
        error(category, `Failed to recreate ${filePath}:`, recreateError);
      }

      return defaultValue;
    }
  } catch (error) {
    error(category, `Error accessing ${filePath}:`, error);
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
      info(category, `Created new file at ${filePath} with default values after access error`);
    } catch (writeError) {
      error(category, `Failed to create new file after access error:`, writeError);
    }
    return defaultValue;
  }
}

/**
 * Safely writes data to a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {any} data - Data to write to the file
 * @returns {Promise<boolean>} - Success status
 */
async function safeWriteJSON(filePath, data) {
  const category = 'JsonUtils';
  debug(category, `Writing JSON to file: ${filePath}`);

  try {
    // Create a backup of the existing file if it exists
    if (fs.existsSync(filePath)) {
      try {
        const backupPath = `${filePath}.backup-${Date.now()}`;
        await fs.promises.copyFile(filePath, backupPath);
        debug(category, `Created backup before write: ${backupPath}`);
      } catch (backupError) {
        warn(category, `Failed to create backup before write: ${filePath}`, backupError);
      }
    }

    // Log data structure before writing
    if (Array.isArray(data)) {
      debug(category, `Writing JSON array with ${data.length} items`);
      if (data.length > 0) {
        debug(category, `First item sample:`, data[0]);
      }
    } else {
      debug(category, `Writing JSON object with ${Object.keys(data).length} keys`);
    }

    // Write data directly to a string first to validate it
    debug(category, `Stringifying data for validation`);
    const jsonString = JSON.stringify(data, null, 2);
    debug(category, `Stringified data length: ${jsonString.length} bytes`);

    // Validate the JSON
    try {
      debug(category, `Validating JSON string`);
      JSON.parse(jsonString);
      debug(category, `JSON validation successful`);
    } catch (validateError) {
      error(category, `Attempted to write invalid JSON to ${filePath}`, validateError);
      error(category, `Invalid data:`, data);
      return false;
    }

    // Write the data directly to the file
    debug(category, `Writing validated JSON to file: ${filePath}`);
    await fs.promises.writeFile(filePath, jsonString, { encoding: 'utf8', flag: 'w' });
    info(category, `Successfully wrote JSON to file: ${filePath}`);
    return true;
  } catch (err) {
    error(category, `Error writing to ${filePath}:`, err);
    return false;
  }
}

/**
 * Safely deletes a JSON file if it exists
 * @param {string} filePath - Path to the JSON file to delete
 * @returns {Promise<boolean>} - Success status
 */
async function safeDeleteJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      // Create backup before deletion
      try {
        const backupPath = `${filePath}.deleted-${Date.now()}`;
        await fs.promises.copyFile(filePath, backupPath);
        console.log(`Created backup before deletion: ${backupPath}`);
      } catch (backupError) {
        console.warn(`Failed to create backup before deletion: ${filePath}`, backupError);
      }

      await fs.promises.unlink(filePath);
      return true;
    }
    return false; // File didn't exist, nothing to delete
  } catch (error) {
    console.error(`Error deleting ${filePath}:`, error);
    return false;
  }
}

/**
 * Creates a backup of a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {string} reason - Reason for backup (used in filename)
 * @returns {Promise<string|null>} - Path to the backup file or null if failed
 */
async function backupJSONFile(filePath, reason = 'backup') {
  try {
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.${reason}-${Date.now()}`;
      await fs.promises.copyFile(filePath, backupPath);
      return backupPath;
    }
    return null; // File doesn't exist, no backup created
  } catch (error) {
    console.error(`Error backing up ${filePath}:`, error);
    return null;
  }
}

/**
 * Validates that data is a valid JSON object or array
 * @param {any} data - Data to validate
 * @returns {boolean} - True if data is valid JSON, false otherwise
 */
function validateJSONData(data) {
  // null is a valid JSON value
  return data === null || (typeof data === 'object' || Array.isArray(data));
}

/**
 * Validates that data is an array
 * @param {any} data - Data to validate
 * @returns {boolean} - True if data is an array, false otherwise
 */
function validateArrayData(data) {
  return Array.isArray(data);
}

export {
  safeReadJSON,
  safeWriteJSON,
  safeDeleteJSON,
  backupJSONFile,
  validateArrayData,
  validateJSONData
};