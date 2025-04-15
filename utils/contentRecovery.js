/**
 * Content Recovery Utility for the Sticker application
 * Provides recovery mechanisms for content loading failures
 */

import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';
import { ERROR_CATEGORIES } from './errorHandler.js';
import { safeReadJSON, safeWriteJSON, backupJSONFile } from './jsonUtils.js';

// Create a logger for content recovery
const logger = new Logger({ category: 'ContentRecovery' });

/**
 * Find backup files for a given file path
 * @param {string} filePath - Original file path
 * @returns {Promise<Array<string>>} Array of backup file paths sorted by creation time (newest first)
 */
async function findBackupFiles(filePath) {
  try {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath);
    
    // Check if directory exists
    if (!fs.existsSync(dir)) {
      return [];
    }
    
    // Get all files in directory
    const files = await fs.promises.readdir(dir);
    
    // Filter backup files
    const backupFiles = files.filter(file => {
      return file.startsWith(baseName) && (
        file.includes('.backup-') || 
        file.includes('.deleted-') || 
        file.includes('.pre-update')
      );
    });
    
    // Get file stats for sorting
    const fileStats = await Promise.all(
      backupFiles.map(async file => {
        const fullPath = path.join(dir, file);
        const stats = await fs.promises.stat(fullPath);
        return { path: fullPath, mtime: stats.mtime };
      })
    );
    
    // Sort by modification time (newest first)
    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    return fileStats.map(file => file.path);
  } catch (err) {
    logger.error(`Failed to find backup files for ${filePath}:`, err);
    return [];
  }
}

/**
 * Recover content from backup files
 * @param {string} filePath - Original file path
 * @returns {Promise<any>} Recovered content or null if recovery failed
 */
async function recoverFromBackup(filePath) {
  try {
    logger.info(`Attempting to recover content from backup for ${filePath}`);
    
    // Find backup files
    const backupFiles = await findBackupFiles(filePath);
    
    if (backupFiles.length === 0) {
      logger.warn(`No backup files found for ${filePath}`);
      return null;
    }
    
    logger.info(`Found ${backupFiles.length} backup files for ${filePath}`);
    
    // Try each backup file until one works
    for (const backupFile of backupFiles) {
      try {
        logger.info(`Trying to recover from ${backupFile}`);
        const content = await safeReadJSON(backupFile, null);
        
        if (content !== null) {
          logger.info(`Successfully recovered content from ${backupFile}`);
          
          // Restore the content to the original file
          await safeWriteJSON(filePath, content);
          
          return content;
        }
      } catch (err) {
        logger.warn(`Failed to recover from ${backupFile}:`, err);
      }
    }
    
    logger.warn(`All backup recovery attempts failed for ${filePath}`);
    return null;
  } catch (err) {
    logger.error(`Error during backup recovery for ${filePath}:`, err);
    return null;
  }
}

/**
 * Create an empty content file with default structure
 * @param {string} filePath - File path
 * @param {any} defaultContent - Default content structure
 * @returns {Promise<boolean>} Success status
 */
async function createEmptyContent(filePath, defaultContent = []) {
  try {
    logger.info(`Creating empty content file at ${filePath}`);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    
    // Write default content
    const result = await safeWriteJSON(filePath, defaultContent);
    
    if (result) {
      logger.info(`Successfully created empty content file at ${filePath}`);
    } else {
      logger.error(`Failed to create empty content file at ${filePath}`);
    }
    
    return result;
  } catch (err) {
    logger.error(`Error creating empty content file at ${filePath}:`, err);
    return false;
  }
}

/**
 * Attempt to repair corrupted JSON file
 * @param {string} filePath - Path to corrupted file
 * @returns {Promise<any>} Repaired content or null if repair failed
 */
async function repairCorruptedFile(filePath) {
  try {
    logger.info(`Attempting to repair corrupted file: ${filePath}`);
    
    // Create backup before attempting repair
    await backupJSONFile(filePath, 'pre-repair');
    
    // Read file as text
    const fileContent = await fs.promises.readFile(filePath, 'utf8').catch(() => '');
    
    if (!fileContent) {
      logger.warn(`File is empty or unreadable: ${filePath}`);
      return null;
    }
    
    // Try to fix common JSON syntax errors
    let repairedContent = fileContent
      // Fix missing quotes around property names
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      // Fix trailing commas in arrays
      .replace(/,\s*]/g, ']')
      // Fix trailing commas in objects
      .replace(/,\s*}/g, '}')
      // Fix missing quotes around string values
      .replace(/:\s*([^",\{\[\]\}\d][^,\{\[\]\}]*[^",\{\[\]\}\d])(\s*[,\}\]])/g, ':"$1"$2');
    
    // Try to parse the repaired content
    try {
      const parsed = JSON.parse(repairedContent);
      
      // Write the repaired content back to the file
      await safeWriteJSON(filePath, parsed);
      
      logger.info(`Successfully repaired corrupted file: ${filePath}`);
      return parsed;
    } catch (parseErr) {
      logger.warn(`Failed to repair corrupted file: ${filePath}`, parseErr);
      return null;
    }
  } catch (err) {
    logger.error(`Error during file repair for ${filePath}:`, err);
    return null;
  }
}

/**
 * Recover content based on error category
 * @param {string} filePath - File path
 * @param {string} errorCategory - Error category
 * @param {any} defaultContent - Default content to use if recovery fails
 * @returns {Promise<Object>} Recovery result
 */
async function recoverContent(filePath, errorCategory, defaultContent = []) {
  try {
    logger.info(`Attempting to recover content for ${filePath}, error category: ${errorCategory}`);
    
    let content = null;
    let recoveryMethod = 'none';
    
    switch (errorCategory) {
      case ERROR_CATEGORIES.FILE_NOT_FOUND:
        // Try to recover from backup first
        content = await recoverFromBackup(filePath);
        
        if (content !== null) {
          recoveryMethod = 'backup';
        } else {
          // Create empty content if no backup found
          const created = await createEmptyContent(filePath, defaultContent);
          if (created) {
            content = defaultContent;
            recoveryMethod = 'empty';
          }
        }
        break;
        
      case ERROR_CATEGORIES.FILE_CORRUPTED:
        // Try to repair the file
        content = await repairCorruptedFile(filePath);
        
        if (content !== null) {
          recoveryMethod = 'repair';
        } else {
          // Try backup if repair failed
          content = await recoverFromBackup(filePath);
          
          if (content !== null) {
            recoveryMethod = 'backup';
          } else {
            // Create empty content if all else fails
            const created = await createEmptyContent(filePath, defaultContent);
            if (created) {
              content = defaultContent;
              recoveryMethod = 'empty';
            }
          }
        }
        break;
        
      case ERROR_CATEGORIES.PERMISSION_DENIED:
        // Can't do much about permission issues
        logger.warn(`Cannot recover from permission denied error for ${filePath}`);
        recoveryMethod = 'failed';
        break;
        
      default:
        // For other errors, try backup first
        content = await recoverFromBackup(filePath);
        
        if (content !== null) {
          recoveryMethod = 'backup';
        } else {
          // Create empty content if no backup found
          const created = await createEmptyContent(filePath, defaultContent);
          if (created) {
            content = defaultContent;
            recoveryMethod = 'empty';
          } else {
            recoveryMethod = 'failed';
          }
        }
        break;
    }
    
    return {
      success: content !== null,
      content: content || defaultContent,
      recoveryMethod
    };
  } catch (err) {
    logger.error(`Error during content recovery for ${filePath}:`, err);
    
    return {
      success: false,
      content: defaultContent,
      recoveryMethod: 'failed'
    };
  }
}

/**
 * Circuit breaker for content loading
 */
class CircuitBreaker {
  /**
   * Create a new CircuitBreaker instance
   * @param {Object} options - Circuit breaker options
   * @param {number} options.failureThreshold - Number of failures before opening circuit
   * @param {number} options.resetTimeout - Time in ms to wait before attempting to close circuit
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.operations = new Map();
  }
  
  /**
   * Execute a function with circuit breaker protection
   * @param {string} operationKey - Unique key for the operation
   * @param {Function} fn - Function to execute
   * @param {Array} args - Arguments to pass to the function
   * @returns {Promise<any>} Result of the function or error
   */
  async execute(operationKey, fn, ...args) {
    // Check if this operation has its own circuit
    if (!this.operations.has(operationKey)) {
      this.operations.set(operationKey, {
        state: 'CLOSED',
        failures: 0,
        lastFailureTime: null
      });
    }
    
    const circuit = this.operations.get(operationKey);
    
    // Check if circuit is open
    if (circuit.state === 'OPEN') {
      // Check if reset timeout has elapsed
      if (Date.now() - circuit.lastFailureTime >= this.resetTimeout) {
        // Move to half-open state
        circuit.state = 'HALF_OPEN';
        logger.info(`Circuit for ${operationKey} is now HALF_OPEN`);
      } else {
        // Circuit is still open
        logger.warn(`Circuit for ${operationKey} is OPEN, rejecting request`);
        throw new Error(`Circuit breaker is open for ${operationKey}`);
      }
    }
    
    try {
      // Execute the function
      const result = await fn(...args);
      
      // If successful and in half-open state, close the circuit
      if (circuit.state === 'HALF_OPEN') {
        circuit.state = 'CLOSED';
        circuit.failures = 0;
        logger.info(`Circuit for ${operationKey} is now CLOSED`);
      }
      
      return result;
    } catch (err) {
      // Increment failure count
      circuit.failures++;
      circuit.lastFailureTime = Date.now();
      
      // Check if failure threshold has been reached
      if (circuit.failures >= this.failureThreshold) {
        circuit.state = 'OPEN';
        logger.warn(`Circuit for ${operationKey} is now OPEN after ${circuit.failures} failures`);
      }
      
      throw err;
    }
  }
  
  /**
   * Reset a specific circuit
   * @param {string} operationKey - Operation key to reset
   */
  reset(operationKey) {
    if (this.operations.has(operationKey)) {
      this.operations.set(operationKey, {
        state: 'CLOSED',
        failures: 0,
        lastFailureTime: null
      });
      logger.info(`Circuit for ${operationKey} has been reset`);
    }
  }
  
  /**
   * Reset all circuits
   */
  resetAll() {
    this.operations.forEach((_, key) => {
      this.reset(key);
    });
    logger.info('All circuits have been reset');
  }
}

// Create a global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

export {
  findBackupFiles,
  recoverFromBackup,
  createEmptyContent,
  repairCorruptedFile,
  recoverContent,
  CircuitBreaker,
  circuitBreaker
};
