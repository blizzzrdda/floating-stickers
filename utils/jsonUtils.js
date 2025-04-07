const fs = require('fs');
const path = require('path');

/**
 * Safely reads and parses a JSON file with comprehensive error handling
 * @param {string} filePath - Path to the JSON file
 * @param {any} defaultValue - Default value to return if file doesn't exist or is invalid
 * @returns {Promise<any>} - Parsed JSON data or default value
 */
async function safeReadJSON(filePath, defaultValue = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File doesn't exist, creating with default value: ${filePath}`);
      await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }

    const data = await fs.promises.readFile(filePath, 'utf8');
    if (!data || data.trim() === '') {
      console.warn(`Empty file found: ${filePath}, recreating with default value`);
      await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }

    try {
      const parsed = JSON.parse(data);
      return parsed;
    } catch (parseError) {
      console.error(`Error parsing JSON from ${filePath}:`, parseError);
      
      // Create backup of corrupted file
      try {
        const backupPath = `${filePath}.corrupt-${Date.now()}`;
        await fs.promises.writeFile(backupPath, data);
        console.log(`Created backup of corrupted file at ${backupPath}`);
      } catch (backupError) {
        console.error(`Failed to create backup of corrupted file:`, backupError);
      }
      
      // Try to delete and recreate the file
      try {
        await fs.promises.unlink(filePath);
        await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
        console.log(`Recreated ${filePath} with default values`);
      } catch (recreateError) {
        console.error(`Failed to recreate ${filePath}:`, recreateError);
      }
      
      return defaultValue;
    }
  } catch (error) {
    console.error(`Error accessing ${filePath}:`, error);
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
      console.log(`Created new file at ${filePath} with default values after access error`);
    } catch (writeError) {
      console.error(`Failed to create new file after access error:`, writeError);
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
  try {
    // Create a backup of the existing file if it exists
    if (fs.existsSync(filePath)) {
      try {
        const backupPath = `${filePath}.backup-${Date.now()}`;
        await fs.promises.copyFile(filePath, backupPath);
      } catch (backupError) {
        console.warn(`Failed to create backup before write: ${filePath}`, backupError);
      }
    }
    
    // Write data directly to a string first to validate it
    const jsonString = JSON.stringify(data, null, 2);
    
    // Validate the JSON
    try {
      JSON.parse(jsonString);
    } catch (validateError) {
      console.error(`Attempted to write invalid JSON to ${filePath}`, validateError);
      return false;
    }
    
    // Write the data directly to the file
    await fs.promises.writeFile(filePath, jsonString, { encoding: 'utf8', flag: 'w' });
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
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
  return data !== null && (typeof data === 'object' || Array.isArray(data));
}

/**
 * Validates that data is an array
 * @param {any} data - Data to validate
 * @returns {boolean} - True if data is an array, false otherwise
 */
function validateArrayData(data) {
  return Array.isArray(data);
}

module.exports = {
  safeReadJSON,
  safeWriteJSON,
  safeDeleteJSON,
  backupJSONFile,
  validateArrayData,
  validateJSONData
}; 