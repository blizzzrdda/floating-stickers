import fs from 'fs';
import path from 'path';
import { safeReadJSON, safeWriteJSON, backupJSONFile, validateJSONData, validateArrayData } from './jsonUtils.js';
import { Logger, LOG_LEVELS } from './logger.js';
import {
  loadArrayContent,
  loadArrayContentWithFeedback,
  validateStickerContent,
  validateStickerLayout,
  validateStickerContentArray,
  validateStickerLayoutArray
} from './contentLoader.js';
import { handleContentLoadingError, ERROR_CATEGORIES } from './errorHandler.js';
import { recoverContent } from './contentRecovery.js';
import { displayError, displayWarning, displayInfo } from '../ui/errorDisplay.js';

// Create a logger for StickerDataManager
const logger = new Logger({
  category: 'StickerDataManager',
  logLevel: LOG_LEVELS.DEBUG // Explicitly set to DEBUG level
});

/**
 * Handles loading sticker layout and content data
 */
class StickerDataManager {
  /**
   * Initialize the StickerDataManager
   * @param {string} userDataPath - Base path for saving user data
   */
  constructor(userDataPath) {
    console.log(`[DEBUG] Initializing StickerDataManager with userDataPath: ${userDataPath}`);

    this.userDataPath = userDataPath;
    this.layoutFilePath = path.join(userDataPath, 'stickers-layout.json');
    this.contentFilePath = path.join(userDataPath, 'stickers-content.json');

    console.log(`[DEBUG] StickerDataManager initialized with: Layout file path: ${this.layoutFilePath}`);
    console.log(`[DEBUG] StickerDataManager initialized with: Content file path: ${this.contentFilePath}`);

    // Ensure the user data directory exists - this is async but we'll handle it properly in the methods
    this.ensureDirectoryExists().catch(err => {
      console.error(`[ERROR] Failed to ensure directory exists during initialization: ${err.message}`);
    });
  }

  /**
   * Ensure the user data directory exists
   * @private
   */
  async ensureDirectoryExists() {
    try {
      if (!fs.existsSync(this.userDataPath)) {
        logger.info(`Creating directory: ${this.userDataPath}`);
        await fs.promises.mkdir(this.userDataPath, { recursive: true });
      }

      // Check if we can write to the directory
      const testFile = path.join(this.userDataPath, 'test-write.tmp');
      try {
        await fs.promises.writeFile(testFile, 'test');
        await fs.promises.unlink(testFile);
      } catch (writeError) {
        logger.error(`Cannot write to directory: ${this.userDataPath}`, writeError);
        throw new Error(`Cannot write to directory: ${this.userDataPath}`);
      }
    } catch (error) {
      logger.error(`Failed to create or verify user data directory: ${this.userDataPath}`, error);
      throw error; // Re-throw to handle it in the calling method
    }
  }

  /**
   * Load sticker layout data with enhanced error handling, recovery, and user feedback
   * @param {Object} options - Loading options
   * @param {boolean} options.showErrors - Whether to display errors to the user
   * @returns {Promise<Array>} Layout data array
   */
  async loadLayoutData(options = {}) {
    logger.debug(`Loading layout data from ${this.layoutFilePath}`);

    try {
      // Use the content loader utility with enhanced error handling and recovery
      const result = await loadArrayContent(this.layoutFilePath, [], {
        maxRetries: options.maxRetries || 3,
        retryDelay: options.retryDelay || 300,
        timeout: options.timeout || 5000,
        validator: validateStickerLayoutArray,
        showErrors: options.showErrors,
        useRecovery: options.useRecovery !== false,
        operationKey: 'loadLayoutData'
      });

      // Log results based on source
      if (result.content.length === 0) {
        logger.info('Layout data is empty array');
      } else {
        logger.info(`Successfully loaded ${result.content.length} layout items from ${result.source}`);
      }

      // If data was recovered, log it
      if (result.recovered) {
        logger.info(`Layout data was recovered from ${result.source}`);

        if (options.showErrors) {
          displayInfo(`Layout data was recovered successfully.`);
        }
      }

      return result.content;
    } catch (err) {
      logger.error('Failed to load layout data:', err);

      // Handle error with user feedback if enabled
      if (options.showErrors) {
        const errorInfo = handleContentLoadingError(err, {
          filePath: this.layoutFilePath,
          operation: 'loadLayoutData'
        });

        displayError(errorInfo, async () => {
          // On retry, attempt recovery
          try {
            const recoveryResult = await recoverContent(
              this.layoutFilePath,
              categorizeError(err),
              []
            );

            if (recoveryResult.success) {
              displayInfo('Layout data recovered successfully.');
            }
          } catch (recoveryErr) {
            logger.error('Recovery attempt failed:', recoveryErr);
          }
        });
      }

      // Create a new empty file if loading failed
      try {
        await safeWriteJSON(this.layoutFilePath, []);
        logger.info(`Created new empty layout file after load failure`);
      } catch (writeErr) {
        logger.error('Failed to create new layout file:', writeErr);
      }

      return [];
    }
  }

  /**
   * Load sticker content data with enhanced error handling, recovery, and user feedback
   * @param {Object} options - Loading options
   * @param {boolean} options.showErrors - Whether to display errors to the user
   * @returns {Promise<Array>} Content data array
   */
  async loadContentData(options = {}) {
    logger.debug(`Loading content data from ${this.contentFilePath}`);

    try {
      // Use the content loader utility with enhanced error handling and recovery
      const result = await loadArrayContent(this.contentFilePath, [], {
        maxRetries: options.maxRetries || 3,
        retryDelay: options.retryDelay || 300,
        timeout: options.timeout || 5000,
        validator: validateStickerContentArray,
        showErrors: options.showErrors,
        useRecovery: options.useRecovery !== false,
        operationKey: 'loadContentData'
      });

      // Log content data details
      if (result.content.length > 0) {
        logger.debug(`Content data contains ${result.content.length} items from ${result.source}`);
        result.content.forEach((item, index) => {
          if (item && item.id) {
            const contentLength = item.content ? item.content.length : 0;
            const contentPreview = item.content ? `${item.content.substring(0, 20)}${contentLength > 20 ? '...' : ''}` : '';
            logger.debug(`Content item ${index}: ID=${item.id}, Length=${contentLength}, Preview="${contentPreview}"`);
          } else {
            logger.warn(`Invalid content item at index ${index}:`, item);
          }
        });
      } else {
        logger.info('Content data is empty array');
      }

      // If data was recovered, log it
      if (result.recovered) {
        logger.info(`Content data was recovered from ${result.source}`);

        if (options.showErrors) {
          displayInfo(`Content data was recovered successfully.`);
        }
      }

      return result.content;
    } catch (err) {
      logger.error('Failed to load content data:', err);

      // Handle error with user feedback if enabled
      if (options.showErrors) {
        const errorInfo = handleContentLoadingError(err, {
          filePath: this.contentFilePath,
          operation: 'loadContentData'
        });

        displayError(errorInfo, async () => {
          // On retry, attempt recovery
          try {
            const recoveryResult = await recoverContent(
              this.contentFilePath,
              categorizeError(err),
              []
            );

            if (recoveryResult.success) {
              displayInfo('Content data recovered successfully.');
            }
          } catch (recoveryErr) {
            logger.error('Recovery attempt failed:', recoveryErr);
          }
        });
      }

      // Create a new empty file if loading failed
      try {
        await safeWriteJSON(this.contentFilePath, []);
        logger.info(`Created new empty content file after load failure`);
      } catch (writeErr) {
        logger.error('Failed to create new content file:', writeErr);
      }

      return [];
    }
  }

  /**
   * Save sticker layout data with validation and error handling
   * @param {Array} layoutData - Array of sticker layout objects
   * @param {Object} options - Save options
   * @returns {Promise<boolean>} Success status
   */
  async saveLayoutData(layoutData, options = {}) {
    const category = 'StickerDataManager';
    console.log(`[DEBUG] Saving layout data with ${layoutData ? layoutData.length : 0} items to ${this.layoutFilePath}`);
    logger.info(`Saving layout data with ${layoutData ? layoutData.length : 0} items to ${this.layoutFilePath}`);

    // Ensure the directory exists
    await this.ensureDirectoryExists();

    try {
      // Validate input
      if (!validateArrayData(layoutData)) {
        logger.error('Attempted to save invalid layout data: not an array');
        return false;
      }

      // Create backup before saving
      if (options.createBackup !== false && fs.existsSync(this.layoutFilePath)) {
        try {
          const backupPath = await backupJSONFile(this.layoutFilePath, 'pre-save');
          logger.debug(`Created layout backup at ${backupPath}`);
        } catch (backupErr) {
          console.warn(category, 'Failed to create layout backup before saving:', backupErr);
        }
      }

      // Filter out any invalid items with detailed validation
      logger.debug(`Validating ${layoutData.length} layout items`);
      const validLayoutData = layoutData.filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn(category, 'Filtering out invalid layout item: not an object', item);
          return false;
        }

        if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
          console.warn(category, 'Filtering out invalid layout item: missing or invalid ID', item);
          return false;
        }

        if (!item.position || typeof item.position !== 'object' ||
            typeof item.position.x !== 'number' || typeof item.position.y !== 'number') {
          console.warn(category, `Filtering out layout item with ID ${item.id}: invalid position`, item.position);
          return false;
        }

        if (!item.size || typeof item.size !== 'object' ||
            typeof item.size.width !== 'number' || typeof item.size.height !== 'number') {
          console.warn(category, `Filtering out layout item with ID ${item.id}: invalid size`, item.size);
          return false;
        }

        return true;
      });

      logger.debug(`Filtered layout data: ${layoutData.length} -> ${validLayoutData.length} items`);

      // Save with retry if needed
      if (options.retry) {
        console.log(`[DEBUG] Saving layout data with retry, maxRetries: ${options.maxRetries || 2}`);
        return await withRetry(
          async () => await safeWriteJSON(this.layoutFilePath, validLayoutData),
          { maxRetries: options.maxRetries || 2 }
        );
      } else {
        console.log(`[DEBUG] Saving layout data without retry`);
        const result = await safeWriteJSON(this.layoutFilePath, validLayoutData);
        if (result) {
          console.log(`[DEBUG] Successfully saved ${validLayoutData.length} layout items`);
          logger.info(`Successfully saved ${validLayoutData.length} layout items`);
        } else {
          console.error(`[ERROR] Failed to save layout data`);
          logger.error(`Failed to save layout data`);
        }
        return result;
      }
    } catch (err) {
      console.error(`[ERROR] Failed to save layout data:`, err);
      logger.error('Failed to save layout data:', err);
      return false;
    }
  }

  /**
   * Save sticker content data with validation and error handling
   * @param {Array} contentData - Array of sticker content objects
   * @param {Object} options - Save options
   * @returns {Promise<boolean>} Success status
   */
  async saveContentData(contentData, options = {}) {
    logger.info(`Saving content data with ${contentData ? contentData.length : 0} items to ${this.contentFilePath}`);

    // Ensure the directory exists
    await this.ensureDirectoryExists();

    try {
      // Validate input
      if (!validateArrayData(contentData)) {
        logger.error('Attempted to save invalid content data: not an array');
        return false;
      }

      // Create backup before saving
      if (options.createBackup !== false && fs.existsSync(this.contentFilePath)) {
        try {
          const backupPath = await backupJSONFile(this.contentFilePath, 'pre-save');
          logger.debug(`Created content backup at ${backupPath}`);
        } catch (backupErr) {
          console.warn(category, 'Failed to create content backup before saving:', backupErr);
        }
      }

      // Filter out any invalid items with detailed validation
      logger.debug(`Validating ${contentData.length} content items`);
      const validContentData = contentData.filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn(category, 'Filtering out invalid content item: not an object', item);
          return false;
        }

        if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
          console.warn(category, 'Filtering out invalid content item: missing or invalid ID', item);
          return false;
        }

        if (item.content !== undefined && typeof item.content !== 'string') {
          console.warn(category, `Filtering out content item with ID ${item.id}: content is not a string`, typeof item.content);
          return false;
        }

        return true;
      });

      // Ensure all content values are strings
      const sanitizedContentData = validContentData.map(item => ({
        id: item.id,
        content: item.content || ''
      }));

      logger.debug(`Filtered content data: ${contentData.length} -> ${sanitizedContentData.length} items`);

      // Save with retry if needed
      if (options.retry) {
        logger.debug(`Saving content data with retry, maxRetries: ${options.maxRetries || 2}`);
        return await withRetry(
          async () => await safeWriteJSON(this.contentFilePath, sanitizedContentData),
          { maxRetries: options.maxRetries || 2 }
        );
      } else {
        const result = await safeWriteJSON(this.contentFilePath, sanitizedContentData);
        if (result) {
          logger.info(`Successfully saved ${sanitizedContentData.length} content items`);
        } else {
          logger.error(`Failed to save content data`);
        }
        return result;
      }
    } catch (err) {
      logger.error('Failed to save content data:', err);
      return false;
    }
  }

  /**
   * Load combined sticker data (layout + content) with enhanced error handling, recovery, and user feedback
   * @param {Object} options - Loading options
   * @param {boolean} options.showErrors - Whether to display errors to the user
   * @returns {Promise<Array>} Combined sticker data array
   */
  async loadStickerData(options = {}) {
    logger.info('Loading sticker data');

    try {
      // Check if files exist before trying to load them
      const layoutExists = fs.existsSync(this.layoutFilePath);
      const contentExists = fs.existsSync(this.contentFilePath);

      logger.info(`Layout file exists: ${layoutExists}, Content file exists: ${contentExists}`);
      logger.info(`Layout path: ${this.layoutFilePath}`);
      logger.info(`Content path: ${this.contentFilePath}`);

      // If files exist, check if they're readable and have content
      if (layoutExists) {
        try {
          const layoutStats = fs.statSync(this.layoutFilePath);
          if (layoutStats.size === 0) {
            logger.warn('Layout file exists but is empty');
          }
        } catch (err) {
          logger.error(`Error checking layout file stats: ${err.message}`);
        }
      }

      if (contentExists) {
        try {
          const contentStats = fs.statSync(this.contentFilePath);
          if (contentStats.size === 0) {
            logger.warn('Content file exists but is empty');
          }
        } catch (err) {
          logger.error(`Error checking content file stats: ${err.message}`);
        }
      }

      // If neither file exists, return an empty array without writing anything
      if (!layoutExists && !contentExists) {
        logger.info('No sticker data files exist yet, returning empty array');

        if (options.showErrors) {
          displayInfo('No sticker data found. Creating new data files.');
        }

        return [];
      }

      // Load layout and content data with enhanced error handling and recovery
      logger.debug('Loading layout and content data with enhanced error handling...');

      // Use the loadArrayContentWithFeedback for automatic error handling and user feedback
      const loadOptions = {
        ...options,
        showErrors: options.showErrors,
        useRecovery: options.useRecovery !== false
      };

      // Load both layout and content data concurrently
      const [layoutResult, contentResult] = await Promise.all([
        loadArrayContentWithFeedback(this.layoutFilePath, [], {
          ...loadOptions,
          validator: validateStickerLayoutArray,
          operationKey: 'loadStickerLayout'
        }),
        loadArrayContentWithFeedback(this.contentFilePath, [], {
          ...loadOptions,
          validator: validateStickerContentArray,
          operationKey: 'loadStickerContent'
        })
      ]);

      const layoutData = layoutResult.content;
      const contentData = contentResult.content;

      logger.debug(`Loaded ${layoutData.length} layout items and ${contentData.length} content items`);

      // Log recovery information if applicable
      if (layoutResult.recovered || contentResult.recovered) {
        logger.info(`Data recovery was performed: layout=${layoutResult.recovered}, content=${contentResult.recovered}`);

        if (options.showErrors) {
          displayInfo('Some sticker data was recovered from backups.');
        }
      }

      // Create a map of content by ID for efficient lookup
      logger.info('Creating content map for lookup');

      const contentMap = new Map();
      contentData.forEach(item => {
        if (item && typeof item.id === 'string' && item.id.trim() !== '') {
          const contentStr = item.content || '';
          contentMap.set(item.id, contentStr);
          logger.debug(`Content for ID ${item.id}: ${contentStr ? 'Present' : 'Empty'} (${contentStr.length} chars)`);
        } else {
          logger.warn('Found invalid content item without valid ID', item);
        }
      });
      logger.info(`Content map contains ${contentMap.size} items`);

      // Merge the data with defensive programming
      logger.info('Merging layout and content data with validation');

      // First, identify layouts that need content entries
      const missingContentLayouts = layoutData
        .filter(layout => {
          const isValid = layout && typeof layout.id === 'string' && layout.id.trim() !== '';
          return isValid && !contentMap.has(layout.id);
        });

      // Create content entries for layouts with missing content
      if (missingContentLayouts.length > 0) {
        logger.info(`Found ${missingContentLayouts.length} layouts with missing content, creating empty content entries`);

        // Create content entries for all missing layouts
        const contentPromises = missingContentLayouts.map(layout => {
          console.log(`No content found for sticker ID ${layout.id}, creating empty content entry`);
          return this.updateStickerContent(layout.id, '');
        });

        // Wait for all content entries to be created
        await Promise.all(contentPromises);

        // Reload content data to include the newly created entries
        logger.info('Reloading content data after creating missing entries');
        const updatedContentData = await this.loadContentData();

        // Update content map with new entries
        updatedContentData.forEach(item => {
          if (item && typeof item.id === 'string' && item.id.trim() !== '') {
            const contentStr = item.content || '';
            contentMap.set(item.id, contentStr);
            logger.debug(`Updated content map: ID ${item.id}: ${contentStr ? 'Present' : 'Empty'} (${contentStr.length} chars)`);
          }
        });

        logger.info(`Content map now contains ${contentMap.size} items after updates`);
      }

      const mergedData = layoutData
        .filter(layout => {
          const isValid = layout && typeof layout.id === 'string' && layout.id.trim() !== '';
          if (!isValid) {
            logger.warn('Filtering out invalid layout item', layout);
          }
          return isValid;
        })
        .map(layout => {
          // Get content or use empty string as fallback
          const content = contentMap.get(layout.id) || '';
          logger.debug(`Merging sticker ID ${layout.id}: Content ${content ? 'found' : 'not found'}, length=${content.length}`);

          // Ensure position and size have valid values
          const position = layout.position && typeof layout.position === 'object'
            ? {
                x: typeof layout.position.x === 'number' ? layout.position.x : 0,
                y: typeof layout.position.y === 'number' ? layout.position.y : 0
              }
            : { x: 0, y: 0 };

          const size = layout.size && typeof layout.size === 'object'
            ? {
                width: typeof layout.size.width === 'number' ? layout.size.width : 250,
                height: typeof layout.size.height === 'number' ? layout.size.height : 80
              }
            : { width: 250, height: 80 };

          return {
            id: layout.id,
            content: typeof content === 'string' ? content : '',
            position,
            size
          };
        });

      logger.info(`Successfully merged data, returning ${mergedData.length} stickers`);
      return mergedData;
    } catch (err) {
      logger.error('Failed to load sticker data:', err);

      // Handle error with user feedback if enabled
      if (options.showErrors) {
        const errorInfo = handleContentLoadingError(err, {
          operation: 'loadStickerData'
        });

        displayError(errorInfo, async () => {
          // On retry, attempt to reload with recovery enabled
          try {
            await this.loadStickerData({
              ...options,
              useRecovery: true,
              showErrors: true
            });
          } catch (retryErr) {
            logger.error('Retry attempt failed:', retryErr);
          }
        });
      }

      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Update content for a specific sticker ID
   * @param {string} id - Sticker ID
   * @param {string} content - New content
   * @returns {Promise<boolean>} Success status
   */
  async updateStickerContent(id, content) {
    try {
      logger.info(`updateStickerContent called for sticker ID=${id}, content length=${content ? content.length : 0}`);
      console.log(`[DEBUG] updateStickerContent called for sticker ID=${id}, content length=${content ? content.length : 0}`);

      // Load current content data
      const contentData = await this.loadContentData();
      console.log(`[DEBUG] updateStickerContent: Loaded ${contentData.length} content items for update`);
      logger.debug(`Loaded ${contentData.length} content items for update`);

      // Find existing content item
      const existingIndex = contentData.findIndex(item => item && item.id === id);
      console.log('[DEBUG] Content data for update:', contentData);

      // Log the result of the search
      if (existingIndex >= 0) {
        logger.debug(`Found existing content at index ${existingIndex} for ID ${id}`);
      } else {
        logger.debug(`No existing content found for ID ${id}, will create new entry`);
      }

      if (existingIndex >= 0) {
        // Update existing content
        const oldContent = contentData[existingIndex].content || '';
        contentData[existingIndex].content = content;
        logger.info(`Updated content for ID ${id}: ${oldContent.length} chars -> ${(content || '').length} chars`);
        console.log(`[DEBUG] Updated content for ID ${id}: ${oldContent.length} chars -> ${(content || '').length} chars`);
      } else {
        // Add new content item
        contentData.push({
          id,
          content: content || ''
        });
        logger.info(`Added new content item for ID ${id}, content length=${content ? content.length : 0}`);
        console.log(`[DEBUG] Added new content item for ID ${id}, content length=${content ? content.length : 0}`);
      }

      // Save updated content data
      logger.debug(`Saving updated content data with ${contentData.length} items`);
      console.log(`[DEBUG] Saving updated content data with ${contentData.length} items`);
      const result = await this.saveContentData(contentData);

      // Log the result of the save operation
      if (result) {
        logger.info(`Successfully saved content for ID ${id}`);
        console.log(`[DEBUG] Successfully saved content for ID ${id}`);
      } else {
        logger.error(`Failed to save content for ID ${id}`);
        console.log(`[ERROR] Failed to save content for ID ${id}`);
      }

      return result;
    } catch (err) {
      logger.error(`Failed to update content for sticker ID ${id}:`, err);
      console.error(`[ERROR] Failed to update content for sticker ID ${id}:`, err);
      return false;
    }
  }

  /**
   * Update a single sticker's data with enhanced validation and error handling
   * @param {Object} stickerData - The sticker data to update
   * @returns {Promise<Object>} Status object with success flags
   */
  async updateSticker(stickerData) {
    logger.debug(`Updating sticker data:`, stickerData ? { id: stickerData.id } : 'undefined');

    try {
      // Validate input
      if (!stickerData || typeof stickerData !== 'object') {
        logger.error('Invalid sticker data provided: not an object');
        return { success: false, error: 'Invalid sticker data provided' };
      }

      // Sanitize the incoming sticker data with defensive programming
      const sanitizedStickerData = {
        id: String(stickerData.id || Date.now()),
        content: String(stickerData.content || ''),
        position: {
          x: Number(isNaN(stickerData.position?.x) ? 0 : stickerData.position.x),
          y: Number(isNaN(stickerData.position?.y) ? 0 : stickerData.position.y)
        },
        size: {
          width: Number(isNaN(stickerData.size?.width) ? 250 : stickerData.size.width),
          height: Number(isNaN(stickerData.size?.height) ? 80 : stickerData.size.height)
        }
      };

      logger.debug(`Sanitized sticker data for ID=${sanitizedStickerData.id}`);

      // Load existing data with retry mechanism
      logger.debug(`Loading existing data for update`);
      const layoutPromise = this.loadLayoutData({ maxRetries: 2 });
      const contentPromise = this.loadContentData({ maxRetries: 2 });

      // Create backups before updating
      logger.debug(`Creating backups before update`);
      const layoutBackupPromise = backupJSONFile(this.layoutFilePath, 'pre-update');
      const contentBackupPromise = backupJSONFile(this.contentFilePath, 'pre-update');

      // Wait for all promises to resolve
      const [layoutData, contentData, layoutBackup, contentBackup] =
        await Promise.all([layoutPromise, contentPromise, layoutBackupPromise, contentBackupPromise]);

      logger.debug(`Loaded layout (${layoutData.length} items) and content (${contentData.length} items)`);
      logger.debug(`Created backups: layout=${layoutBackup}, content=${contentBackup}`);

      // Validate loaded data
      if (!Array.isArray(layoutData) || !Array.isArray(contentData)) {
        logger.error(`Invalid data loaded: layout=${Array.isArray(layoutData)}, content=${Array.isArray(contentData)}`);
        return { success: false, error: 'Failed to load current data' };
      }

      // Update or add layout data
      const layoutIndex = layoutData.findIndex(item => item && item.id === sanitizedStickerData.id);
      const layoutItem = {
        id: sanitizedStickerData.id,
        position: sanitizedStickerData.position,
        size: sanitizedStickerData.size
      };

      if (layoutIndex !== -1) {
        logger.debug(`Updating existing layout at index ${layoutIndex}`);
        layoutData[layoutIndex] = layoutItem;
      } else {
        logger.debug(`Adding new layout item`);
        layoutData.push(layoutItem);
      }

      // Update or add content data
      const contentIndex = contentData.findIndex(item => item && item.id === sanitizedStickerData.id);
      const contentItem = {
        id: sanitizedStickerData.id,
        content: sanitizedStickerData.content
      };

      if (contentIndex !== -1) {
        logger.debug(`Updating existing content at index ${contentIndex}`);
        contentData[contentIndex] = contentItem;
      } else {
        logger.debug(`Adding new content item`);
        contentData.push(contentItem);
      }

      // Save both files
      logger.debug(`Saving updated data`);
      const layoutSavePromise = this.saveLayoutData(layoutData);
      const contentSavePromise = this.saveContentData(contentData);

      const [layoutSaved, contentSaved] = await Promise.all([layoutSavePromise, contentSavePromise]);

      const success = layoutSaved && contentSaved;
      if (success) {
        logger.info(`Successfully updated sticker ID=${sanitizedStickerData.id}`);
      } else {
        logger.warn(`Partial update for sticker ID=${sanitizedStickerData.id}: layout=${layoutSaved}, content=${contentSaved}`);
      }

      return {
        success,
        layoutSaved,
        contentSaved
      };
    } catch (err) {
      logger.error('Error updating sticker:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Remove a sticker by ID with enhanced validation and error handling
   * @param {string} stickerId - ID of the sticker to remove
   * @returns {Promise<Object>} Status object with success flags
   */
  async removeSticker(stickerId) {
    logger.debug(`Removing sticker with ID: ${stickerId}`);

    try {
      // Validate input
      if (!stickerId) {
        logger.error('No sticker ID provided for removal');
        return { success: false, error: 'No sticker ID provided' };
      }

      // Ensure stickerId is a string
      const sanitizedStickerId = String(stickerId);
      logger.debug(`Sanitized sticker ID: ${sanitizedStickerId}`);

      // Load existing data with retry mechanism
      logger.debug(`Loading existing data for removal`);
      const layoutPromise = this.loadLayoutData({ maxRetries: 2 });
      const contentPromise = this.loadContentData({ maxRetries: 2 });

      // Create backups before modifying
      logger.debug(`Creating backups before removal`);
      const layoutBackupPromise = backupJSONFile(this.layoutFilePath, 'pre-delete');
      const contentBackupPromise = backupJSONFile(this.contentFilePath, 'pre-delete');

      // Wait for all promises to resolve
      const [layoutData, contentData, layoutBackup, contentBackup] =
        await Promise.all([layoutPromise, contentPromise, layoutBackupPromise, contentBackupPromise]);

      logger.debug(`Loaded layout (${layoutData.length} items) and content (${contentData.length} items)`);
      logger.debug(`Created backups: layout=${layoutBackup}, content=${contentBackup}`);

      // Validate loaded data
      if (!Array.isArray(layoutData) || !Array.isArray(contentData)) {
        logger.error(`Invalid data loaded: layout=${Array.isArray(layoutData)}, content=${Array.isArray(contentData)}`);
        return { success: false, error: 'Failed to load current data' };
      }

      // Check if sticker exists before removal
      const layoutExists = layoutData.some(item => item && item.id === sanitizedStickerId);
      const contentExists = contentData.some(item => item && item.id === sanitizedStickerId);

      if (!layoutExists && !contentExists) {
        logger.warn(`Sticker with ID ${sanitizedStickerId} not found in either layout or content data`);
      } else {
        logger.debug(`Sticker found: layout=${layoutExists}, content=${contentExists}`);
      }

      // Remove the sticker from both files
      const filteredLayoutData = layoutData.filter(item => item && item.id !== sanitizedStickerId);
      const filteredContentData = contentData.filter(item => item && item.id !== sanitizedStickerId);

      logger.debug(`Filtered out sticker: layout ${layoutData.length} -> ${filteredLayoutData.length}, content ${contentData.length} -> ${filteredContentData.length}`);

      // Save both files
      logger.debug(`Saving updated data`);
      const layoutSavePromise = this.saveLayoutData(filteredLayoutData);
      const contentSavePromise = this.saveContentData(filteredContentData);

      const [layoutSaved, contentSaved] = await Promise.all([layoutSavePromise, contentSavePromise]);

      const success = layoutSaved && contentSaved;
      if (success) {
        logger.info(`Successfully removed sticker ID=${sanitizedStickerId}`);
      } else {
        logger.warn(`Partial removal for sticker ID=${sanitizedStickerId}: layout=${layoutSaved}, content=${contentSaved}`);
      }

      return {
        success,
        layoutSaved,
        contentSaved
      };
    } catch (err) {
      logger.error('Error removing sticker:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Strip HTML tags from content with improved error handling
   * @param {string} html - HTML content to strip
   * @returns {string} Plain text content
   */
  stripHtml(html) {
    // Handle empty or non-string input
    if (!html) return '';
    if (typeof html !== 'string') {
      logger.warn(`stripHtml received non-string input: ${typeof html}`);
      return '';
    }

    // Simple HTML stripping using regex
    try {
      // Use a simple regex-based approach instead of JSDOM
      const result = html.replace(/<[^>]*>/g, '');
      return result;
    } catch (err) {
      logger.error('Error stripping HTML:', err);
      // Return the original string as a fallback
      return html;
    }
  }

  /**
   * Sanitize sticker content to ensure it's safe
   * @param {string} content - Content to sanitize
   * @returns {string} Sanitized content
   */
  sanitizeContent(content) {
    // Handle empty or non-string input
    if (!content) return '';
    if (typeof content !== 'string') {
      logger.warn(`sanitizeContent received non-string input: ${typeof content}`);
      return '';
    }

    try {
      const sanitized = this.stripHtml(content);
      return sanitized;
    } catch (err) {
      logger.error('Error sanitizing content:', err);
      // Return empty string as a safe fallback
      return '';
    }
  }
}

export default StickerDataManager;