/**
 * Data Migration Utility for Sticker Data
 * Provides functions to migrate sticker data between different versions
 */

import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';
import { safeReadJSON, safeWriteJSON, backupJSONFile } from './jsonUtils.js';
import { detectDataVersion, DATA_VERSIONS } from './versionDetection.js';
import { displayInfo, displayWarning, displayError } from '../ui/errorDisplay.js';
import { ERROR_CATEGORIES } from './errorHandler.js';

// Create a logger for data migration
const logger = new Logger({ category: 'DataMigration' });

/**
 * Migrate sticker data to the latest format
 * @param {string} layoutFilePath - Path to layout file
 * @param {string} contentFilePath - Path to content file
 * @param {Object} options - Migration options
 * @param {boolean} options.showErrors - Whether to display errors to the user
 * @param {boolean} options.createBackup - Whether to create backups before migration
 * @returns {Promise<Object>} Migration result
 */
async function migrateData(layoutFilePath, contentFilePath, options = {}) {
  logger.info(`Starting data migration for layout: ${layoutFilePath}, content: ${contentFilePath}`);
  
  try {
    // Detect current data version
    const versionInfo = await detectDataVersion(layoutFilePath, contentFilePath);
    
    logger.info(`Detected data version: ${versionInfo.version}`);
    
    // If no migration is needed, return early
    if (!versionInfo.needsMigration) {
      logger.info('No migration needed, data is already in the latest format');
      return {
        success: true,
        migrated: false,
        message: 'No migration needed'
      };
    }
    
    // Create backups before migration if requested
    if (options.createBackup !== false) {
      await createBackups(layoutFilePath, contentFilePath);
    }
    
    // Perform migration based on detected version
    let migrationResult;
    
    switch (versionInfo.version) {
      case DATA_VERSIONS.UNKNOWN:
        migrationResult = await migrateUnknownFormat(layoutFilePath, contentFilePath, versionInfo);
        break;
        
      // Add cases for future versions here
      // case DATA_VERSIONS.V2:
      //   migrationResult = await migrateFromV2(layoutFilePath, contentFilePath, versionInfo);
      //   break;
        
      default:
        logger.warn(`Unsupported data version: ${versionInfo.version}`);
        migrationResult = {
          success: false,
          message: `Unsupported data version: ${versionInfo.version}`
        };
        break;
    }
    
    // Display migration result to user if requested
    if (options.showErrors) {
      if (migrationResult.success) {
        displayInfo(`Data migration completed successfully: ${migrationResult.message}`);
      } else {
        displayWarning(`Data migration failed: ${migrationResult.message}`);
      }
    }
    
    return migrationResult;
  } catch (err) {
    logger.error('Error during data migration:', err);
    
    // Display error to user if requested
    if (options.showErrors) {
      displayError({
        category: ERROR_CATEGORIES.UNKNOWN,
        userMessage: 'Failed to migrate sticker data. Your data may be in an inconsistent state.',
        errorCode: 'MIGRATION_FAILED',
        recoverable: false
      });
    }
    
    return {
      success: false,
      migrated: false,
      error: err.message
    };
  }
}

/**
 * Create backups of data files before migration
 * @param {string} layoutFilePath - Path to layout file
 * @param {string} contentFilePath - Path to content file
 * @returns {Promise<Object>} Backup result
 */
async function createBackups(layoutFilePath, contentFilePath) {
  logger.info('Creating backups before migration');
  
  const backupResults = {
    layout: null,
    content: null
  };
  
  // Backup layout file if it exists
  if (fs.existsSync(layoutFilePath)) {
    try {
      backupResults.layout = await backupJSONFile(layoutFilePath, 'pre-migration');
      logger.info(`Created layout backup: ${backupResults.layout}`);
    } catch (err) {
      logger.error('Failed to create layout backup:', err);
    }
  }
  
  // Backup content file if it exists
  if (fs.existsSync(contentFilePath)) {
    try {
      backupResults.content = await backupJSONFile(contentFilePath, 'pre-migration');
      logger.info(`Created content backup: ${backupResults.content}`);
    } catch (err) {
      logger.error('Failed to create content backup:', err);
    }
  }
  
  return backupResults;
}

/**
 * Migrate data from unknown format to the latest format
 * @param {string} layoutFilePath - Path to layout file
 * @param {string} contentFilePath - Path to content file
 * @param {Object} versionInfo - Version information
 * @returns {Promise<Object>} Migration result
 */
async function migrateUnknownFormat(layoutFilePath, contentFilePath, versionInfo) {
  logger.info('Attempting to migrate data from unknown format');
  
  try {
    // Try to extract valid sticker data from unknown format
    const extractedData = extractValidStickers(versionInfo.layoutData, versionInfo.contentData);
    
    if (extractedData.stickers.length === 0) {
      logger.warn('No valid stickers could be extracted from unknown format');
      return {
        success: false,
        migrated: false,
        message: 'No valid stickers could be extracted from the data'
      };
    }
    
    // Save extracted layout data
    const layoutData = extractedData.stickers.map(sticker => ({
      id: sticker.id,
      position: sticker.position,
      size: sticker.size
    }));
    
    const layoutSaved = await safeWriteJSON(layoutFilePath, layoutData);
    
    // Save extracted content data
    const contentData = extractedData.stickers.map(sticker => ({
      id: sticker.id,
      content: sticker.content
    }));
    
    const contentSaved = await safeWriteJSON(contentFilePath, contentData);
    
    logger.info(`Migration completed: ${extractedData.stickers.length} stickers extracted, layout saved: ${layoutSaved}, content saved: ${contentSaved}`);
    
    return {
      success: layoutSaved && contentSaved,
      migrated: true,
      stickersExtracted: extractedData.stickers.length,
      message: `Extracted ${extractedData.stickers.length} stickers from unknown format`
    };
  } catch (err) {
    logger.error('Error migrating from unknown format:', err);
    return {
      success: false,
      migrated: false,
      error: err.message,
      message: 'Failed to migrate from unknown format'
    };
  }
}

/**
 * Extract valid stickers from unknown data format
 * @param {any} layoutData - Layout data
 * @param {any} contentData - Content data
 * @returns {Object} Extracted stickers
 */
function extractValidStickers(layoutData, contentData) {
  logger.debug('Extracting valid stickers from unknown data format');
  
  const stickers = [];
  const contentMap = new Map();
  
  // Try to extract content data
  if (contentData !== null) {
    if (Array.isArray(contentData)) {
      // Standard array format
      contentData.forEach(item => {
        if (item && typeof item.id === 'string' && item.id.trim() !== '') {
          contentMap.set(item.id, typeof item.content === 'string' ? item.content : '');
        }
      });
    } else if (typeof contentData === 'object') {
      // Object map format (potential legacy format)
      for (const [key, value] of Object.entries(contentData)) {
        if (key && key.trim() !== '') {
          contentMap.set(key, typeof value === 'string' ? value : '');
        }
      }
    }
  }
  
  logger.debug(`Extracted ${contentMap.size} content items`);
  
  // Try to extract layout data
  if (layoutData !== null) {
    if (Array.isArray(layoutData)) {
      // Standard array format
      layoutData.forEach(item => {
        if (item && typeof item.id === 'string' && item.id.trim() !== '') {
          // Extract position
          const position = { x: 0, y: 0 };
          if (item.position && typeof item.position === 'object') {
            position.x = typeof item.position.x === 'number' ? item.position.x : 0;
            position.y = typeof item.position.y === 'number' ? item.position.y : 0;
          }
          
          // Extract size
          const size = { width: 250, height: 80 };
          if (item.size && typeof item.size === 'object') {
            size.width = typeof item.size.width === 'number' ? item.size.width : 250;
            size.height = typeof item.size.height === 'number' ? item.size.height : 80;
          }
          
          // Get content from map or use empty string
          const content = contentMap.get(item.id) || '';
          
          stickers.push({
            id: item.id,
            content,
            position,
            size
          });
        }
      });
    } else if (typeof layoutData === 'object') {
      // Object map format (potential legacy format)
      for (const [key, value] of Object.entries(layoutData)) {
        if (key && key.trim() !== '') {
          // Extract position and size from value
          const position = { x: 0, y: 0 };
          const size = { width: 250, height: 80 };
          
          if (value && typeof value === 'object') {
            // Try to extract position
            if (value.position && typeof value.position === 'object') {
              position.x = typeof value.position.x === 'number' ? value.position.x : 0;
              position.y = typeof value.position.y === 'number' ? value.position.y : 0;
            } else if (typeof value.x === 'number' && typeof value.y === 'number') {
              position.x = value.x;
              position.y = value.y;
            }
            
            // Try to extract size
            if (value.size && typeof value.size === 'object') {
              size.width = typeof value.size.width === 'number' ? value.size.width : 250;
              size.height = typeof value.size.height === 'number' ? value.size.height : 80;
            } else if (typeof value.width === 'number' && typeof value.height === 'number') {
              size.width = value.width;
              size.height = value.height;
            }
          }
          
          // Get content from map or use empty string
          const content = contentMap.get(key) || '';
          
          stickers.push({
            id: key,
            content,
            position,
            size
          });
        }
      });
    }
  }
  
  logger.debug(`Extracted ${stickers.length} valid stickers`);
  
  return {
    stickers,
    contentMap
  };
}

/**
 * Add version information to data files
 * @param {string} layoutFilePath - Path to layout file
 * @param {string} contentFilePath - Path to content file
 * @param {string} version - Version to set
 * @returns {Promise<Object>} Result
 */
async function addVersionInfo(layoutFilePath, contentFilePath, version = DATA_VERSIONS.V1) {
  logger.info(`Adding version information (${version}) to data files`);
  
  try {
    // Read existing data
    const layoutData = await safeReadJSON(layoutFilePath, []);
    const contentData = await safeReadJSON(contentFilePath, []);
    
    // Add version information
    const versionedLayoutData = Array.isArray(layoutData) ? [...layoutData] : [];
    const versionedContentData = Array.isArray(contentData) ? [...contentData] : [];
    
    // Add version metadata (as a non-enumerable property to avoid affecting existing code)
    Object.defineProperty(versionedLayoutData, '__version', {
      value: version,
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(versionedContentData, '__version', {
      value: version,
      enumerable: true,
      configurable: true
    });
    
    // Save versioned data
    const layoutSaved = await safeWriteJSON(layoutFilePath, versionedLayoutData);
    const contentSaved = await safeWriteJSON(contentFilePath, versionedContentData);
    
    logger.info(`Version information added: layout saved: ${layoutSaved}, content saved: ${contentSaved}`);
    
    return {
      success: layoutSaved && contentSaved,
      version
    };
  } catch (err) {
    logger.error('Error adding version information:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

export {
  migrateData,
  createBackups,
  extractValidStickers,
  addVersionInfo
};
