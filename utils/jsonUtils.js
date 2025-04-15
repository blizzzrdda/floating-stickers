import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';
import {
  ensureDirectoryExists,
  createFileBackup,
  safeReadFile,
  safeWriteFile
} from './fileUtils.js';
import {
  isObject,
  isArray,
  isValidJSON
} from './validationUtils.js';

// Create a logger for JSON operations
const logger = new Logger({ category: 'JsonUtils' });

/**
 * Safely reads and parses a JSON file with comprehensive error handling
 * @param {string} filePath - Path to the JSON file
 * @param {any} defaultValue - Default value to return if file doesn't exist or is invalid
 * @returns {Promise<any>} - Parsed JSON data or default value
 */
async function safeReadJSON(filePath, defaultValue = {}) {
  logger.debug(`Reading JSON file: ${filePath}`);

  try {
    // Read file content
    const data = await safeReadFile(filePath);

    // If file doesn't exist or couldn't be read
    if (data === null) {
      logger.info(`File doesn't exist or couldn't be read, will use default value: ${filePath}`);
      return defaultValue;
    }

    // If file is empty
    if (!data || data.trim() === '') {
      logger.warn(`Empty file found: ${filePath}, will use default value`);
      return defaultValue;
    }

    logger.debug(`File content length: ${data.length} bytes`);

    try {
      logger.debug(`Attempting to parse JSON from: ${filePath}`);
      const parsed = JSON.parse(data);

      // Log the structure of the parsed data
      if (Array.isArray(parsed)) {
        logger.debug(`Successfully parsed JSON array with ${parsed.length} items`);
        if (parsed.length > 0) {
          logger.debug(`First item sample:`, parsed[0]);
        }
      } else {
        logger.debug(`Successfully parsed JSON object with ${Object.keys(parsed).length} keys`);
      }

      return parsed;
    } catch (parseError) {
      logger.error(`Error parsing JSON from ${filePath}:`, parseError);
      logger.error(`Raw data that failed to parse (first 100 chars): ${data.substring(0, 100)}...`);

      // Create backup of corrupted file
      await createFileBackup(filePath, 'corrupt');

      // Try to recreate the file with default values
      const jsonString = JSON.stringify(defaultValue, null, 2);
      const success = await safeWriteFile(filePath, jsonString);

      if (success) {
        logger.info(`Recreated ${filePath} with default values`);
      } else {
        logger.error(`Failed to recreate ${filePath}`);
      }

      return defaultValue;
    }
  } catch (err) {
    logger.error(`Error accessing ${filePath}:`, err);

    // Try to create a new file with default values
    const jsonString = JSON.stringify(defaultValue, null, 2);
    const success = await safeWriteFile(filePath, jsonString);

    if (success) {
      logger.info(`Created new file at ${filePath} with default values after access error`);
    } else {
      logger.error(`Failed to create new file after access error`);
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
  logger.debug(`Writing JSON to file: ${filePath}`);

  try {
    // Create a backup of the existing file if it exists
    if (fs.existsSync(filePath)) {
      await createFileBackup(filePath, 'pre-write');
    }

    // Log data structure before writing
    if (Array.isArray(data)) {
      logger.debug(`Writing JSON array with ${data.length} items`);
      if (data.length > 0) {
        logger.debug(`First item sample:`, data[0]);
      }
    } else {
      logger.debug(`Writing JSON object with ${Object.keys(data).length} keys`);
    }

    // Write data directly to a string first to validate it
    logger.debug(`Stringifying data for validation`);
    const jsonString = JSON.stringify(data, null, 2);
    logger.debug(`Stringified data length: ${jsonString.length} bytes`);

    // Validate the JSON
    try {
      logger.debug(`Validating JSON string`);
      JSON.parse(jsonString);
      logger.debug(`JSON validation successful`);
    } catch (validateError) {
      logger.error(`Attempted to write invalid JSON to ${filePath}`, validateError);
      logger.error(`Invalid data:`, data);
      return false;
    }

    // Write the data directly to the file
    logger.debug(`Writing validated JSON to file: ${filePath}`);
    const success = await safeWriteFile(filePath, jsonString, { encoding: 'utf8' });

    if (success) {
      logger.info(`Successfully wrote JSON to file: ${filePath}`);
      return true;
    } else {
      logger.error(`Failed to write JSON to file: ${filePath}`);
      return false;
    }
  } catch (err) {
    logger.error(`Error writing to ${filePath}:`, err);
    return false;
  }
}

/**
 * Safely deletes a JSON file if it exists
 * @param {string} filePath - Path to the JSON file to delete
 * @returns {Promise<boolean>} - Success status
 */
async function safeDeleteJSON(filePath) {
  logger.debug(`Attempting to delete JSON file: ${filePath}`);
  return safeDeleteFile(filePath, true);
}

/**
 * Creates a backup of a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {string} reason - Reason for backup (used in filename)
 * @returns {Promise<string|null>} - Path to the backup file or null if failed
 */
async function backupJSONFile(filePath, reason = 'backup') {
  logger.debug(`Attempting to backup JSON file: ${filePath} (reason: ${reason})`);
  return createFileBackup(filePath, reason);
}

/**
 * Validates that data is a valid JSON object or array
 * @param {any} data - Data to validate
 * @returns {boolean} - True if data is valid JSON, false otherwise
 */
function validateJSONData(data) {
  try {
    // null is a valid JSON value
    return data === null || isObject(data) || isArray(data);
  } catch (err) {
    logger.error('Error validating JSON data:', err);
    return false;
  }
}

/**
 * Validates that data is an array
 * @param {any} data - Data to validate
 * @returns {boolean} - True if data is an array, false otherwise
 */
function validateArrayData(data) {
  try {
    return isArray(data, 'Array data');
  } catch (err) {
    logger.error('Error validating array data:', err);
    return false;
  }
}

export {
  safeReadJSON,
  safeWriteJSON,
  safeDeleteJSON,
  backupJSONFile,
  validateArrayData,
  validateJSONData
};