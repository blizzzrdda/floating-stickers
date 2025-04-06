const fs = require('fs');
const path = require('path');

/**
 * Safely reads and parses a JSON file with comprehensive error handling
 * @param {string} filePath - Path to the JSON file
 * @param {any} defaultValue - Default value to return if file doesn't exist or is invalid
 * @returns {Promise<any>} - Parsed JSON data or default value
 */
async function safeReadJSON(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      const data = await fs.promises.readFile(filePath, 'utf8');
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        } else {
          console.error(`File ${filePath} does not contain an array, resetting`);
          // Create backup and delete corrupted file
          const backupPath = `${filePath}.backup-${Date.now()}`;
          await fs.promises.writeFile(backupPath, data);
          await fs.promises.unlink(filePath);
          await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
          return defaultValue;
        }
      } catch (parseError) {
        console.error(`Error parsing JSON from ${filePath}:`, parseError);
        // Create backup and delete corrupted file
        const backupPath = `${filePath}.backup-${Date.now()}`;
        await fs.promises.writeFile(backupPath, data);
        await fs.promises.unlink(filePath);
        await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
        return defaultValue;
      }
    } else {
      // File doesn't exist, create it with default value
      await fs.promises.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
  } catch (error) {
    console.error(`Error accessing ${filePath}:`, error);
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
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
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
      const data = await fs.promises.readFile(filePath, 'utf8');
      const backupPath = `${filePath}.${reason}-${Date.now()}`;
      await fs.promises.writeFile(backupPath, data);
      return backupPath;
    }
    return null; // File doesn't exist, no backup created
  } catch (error) {
    console.error(`Error backing up ${filePath}:`, error);
    return null;
  }
}

/**
 * Validates data to ensure it's a proper array
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
  validateArrayData
}; 