/**
 * Version Detection Utility for Sticker Data
 * Provides functions to detect and identify the format of sticker data
 */

import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';
import { safeReadJSON } from './jsonUtils.js';

// Create a logger for version detection
const logger = new Logger({ category: 'VersionDetection' });

// Version identifiers
const DATA_VERSIONS = {
  UNKNOWN: 'unknown',
  V1: 'v1',       // Original format (no version field)
  V2: 'v2'        // New format with version field (future)
};

/**
 * Detect the version of sticker data files
 * @param {string} layoutFilePath - Path to layout file
 * @param {string} contentFilePath - Path to content file
 * @returns {Promise<Object>} Version information
 */
async function detectDataVersion(layoutFilePath, contentFilePath) {
  logger.debug(`Detecting data version for layout: ${layoutFilePath}, content: ${contentFilePath}`);
  
  try {
    // Check if files exist
    const layoutExists = fs.existsSync(layoutFilePath);
    const contentExists = fs.existsSync(contentFilePath);
    
    logger.debug(`Files exist: layout=${layoutExists}, content=${contentExists}`);
    
    if (!layoutExists && !contentExists) {
      logger.info('No data files found, assuming latest version');
      return {
        version: DATA_VERSIONS.V1,
        layoutExists: false,
        contentExists: false,
        needsMigration: false
      };
    }
    
    // Read layout file if it exists
    let layoutData = null;
    if (layoutExists) {
      layoutData = await safeReadJSON(layoutFilePath, null);
    }
    
    // Read content file if it exists
    let contentData = null;
    if (contentExists) {
      contentData = await safeReadJSON(contentFilePath, null);
    }
    
    // Determine version based on file content
    const version = determineVersion(layoutData, contentData);
    
    logger.info(`Detected data version: ${version}`);
    
    return {
      version,
      layoutExists,
      contentExists,
      layoutData,
      contentData,
      needsMigration: version !== DATA_VERSIONS.V1 // Currently V1 is the latest
    };
  } catch (err) {
    logger.error('Error detecting data version:', err);
    return {
      version: DATA_VERSIONS.UNKNOWN,
      layoutExists: false,
      contentExists: false,
      error: err.message,
      needsMigration: false
    };
  }
}

/**
 * Determine the version of sticker data based on content
 * @param {Array|null} layoutData - Layout data array
 * @param {Array|null} contentData - Content data array
 * @returns {string} Version identifier
 */
function determineVersion(layoutData, contentData) {
  // If both are null, assume latest version (for new installations)
  if (layoutData === null && contentData === null) {
    return DATA_VERSIONS.V1;
  }
  
  // Check for explicit version field in layout data (future versions)
  if (layoutData && layoutData.__version) {
    return layoutData.__version;
  }
  
  // Check for explicit version field in content data (future versions)
  if (contentData && contentData.__version) {
    return contentData.__version;
  }
  
  // Check if data matches V1 format
  if (isV1Format(layoutData, contentData)) {
    return DATA_VERSIONS.V1;
  }
  
  // If we can't determine the version, return unknown
  return DATA_VERSIONS.UNKNOWN;
}

/**
 * Check if data matches V1 format
 * @param {Array|null} layoutData - Layout data array
 * @param {Array|null} contentData - Content data array
 * @returns {boolean} True if data matches V1 format
 */
function isV1Format(layoutData, contentData) {
  // Check layout data format
  if (layoutData !== null) {
    // V1 layout data should be an array
    if (!Array.isArray(layoutData)) {
      return false;
    }
    
    // Check if layout items have the expected structure
    if (layoutData.length > 0) {
      const firstItem = layoutData[0];
      
      // V1 layout items should have id, position, and size
      if (!firstItem || 
          typeof firstItem.id !== 'string' ||
          !firstItem.position || typeof firstItem.position !== 'object' ||
          !firstItem.size || typeof firstItem.size !== 'object') {
        return false;
      }
      
      // Position should have x and y
      if (typeof firstItem.position.x !== 'number' || 
          typeof firstItem.position.y !== 'number') {
        return false;
      }
      
      // Size should have width and height
      if (typeof firstItem.size.width !== 'number' || 
          typeof firstItem.size.height !== 'number') {
        return false;
      }
    }
  }
  
  // Check content data format
  if (contentData !== null) {
    // V1 content data should be an array
    if (!Array.isArray(contentData)) {
      return false;
    }
    
    // Check if content items have the expected structure
    if (contentData.length > 0) {
      const firstItem = contentData[0];
      
      // V1 content items should have id and content
      if (!firstItem || 
          typeof firstItem.id !== 'string' ||
          (firstItem.content !== undefined && typeof firstItem.content !== 'string')) {
        return false;
      }
    }
  }
  
  // If we've passed all checks, it's likely V1 format
  return true;
}

/**
 * Check if data needs migration
 * @param {string} version - Detected version
 * @returns {boolean} True if migration is needed
 */
function needsMigration(version) {
  // Currently, only V1 is supported, so any other version needs migration
  return version !== DATA_VERSIONS.V1 && version !== DATA_VERSIONS.UNKNOWN;
}

export {
  detectDataVersion,
  determineVersion,
  isV1Format,
  needsMigration,
  DATA_VERSIONS
};
