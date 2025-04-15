import fs from 'fs';
import path from 'path';
import { safeReadJSON, safeWriteJSON, backupJSONFile, validateJSONData, validateArrayData } from './jsonUtils.js';

/**
 * Handles loading sticker layout and content data
 */
class StickerDataManager {
  /**
   * Initialize the StickerDataManager
   * @param {string} userDataPath - Base path for saving user data
   */
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.layoutFilePath = path.join(userDataPath, 'stickers-layout.json');
    this.contentFilePath = path.join(userDataPath, 'stickers-content.json');

    // Ensure the user data directory exists
    this.ensureDirectoryExists();
  }

  /**
   * Ensure the user data directory exists
   * @private
   */
  async ensureDirectoryExists() {
    try {
      if (!fs.existsSync(this.userDataPath)) {
        await fs.promises.mkdir(this.userDataPath, { recursive: true });
        console.log(`Created user data directory: ${this.userDataPath}`);
      }
    } catch (error) {
      console.error(`Failed to create user data directory: ${this.userDataPath}`, error);
    }
  }

  /**
   * Load sticker layout data
   * @returns {Promise<Array>} Layout data array
   */
  async loadLayoutData() {
    try {
      const data = await safeReadJSON(this.layoutFilePath, []);
      if (!validateArrayData(data)) {
        console.error('Layout data is not an array, resetting to default');
        await safeWriteJSON(this.layoutFilePath, []);
        return [];
      }
      return data;
    } catch (error) {
      console.error('Failed to load layout data:', error);
      return [];
    }
  }

  /**
   * Load sticker content data
   * @returns {Promise<Array>} Content data array
   */
  async loadContentData() {
    try {
      const data = await safeReadJSON(this.contentFilePath, []);
      if (!validateArrayData(data)) {
        console.error('Content data is not an array, resetting to default');
        await safeWriteJSON(this.contentFilePath, []);
        return [];
      }
      return data;
    } catch (error) {
      console.error('Failed to load content data:', error);
      return [];
    }
  }

  /**
   * Save sticker layout data
   * @param {Array} layoutData - Array of sticker layout objects
   * @returns {Promise<boolean>} Success status
   */
  async saveLayoutData(layoutData) {
    try {
      if (!validateArrayData(layoutData)) {
        console.error('Attempted to save invalid layout data');
        return false;
      }

      // Filter out any invalid items
      const validLayoutData = layoutData.filter(item =>
        item && item.id &&
        item.position && typeof item.position.x === 'number' && typeof item.position.y === 'number' &&
        item.size && typeof item.size.width === 'number' && typeof item.size.height === 'number'
      );

      return await safeWriteJSON(this.layoutFilePath, validLayoutData);
    } catch (error) {
      console.error('Failed to save layout data:', error);
      return false;
    }
  }

  /**
   * Save sticker content data
   * @param {Array} contentData - Array of sticker content objects
   * @returns {Promise<boolean>} Success status
   */
  async saveContentData(contentData) {
    try {
      if (!validateArrayData(contentData)) {
        console.error('Attempted to save invalid content data');
        return false;
      }

      // Filter out any invalid items
      const validContentData = contentData.filter(item =>
        item && item.id && typeof item.content === 'string'
      );

      return await safeWriteJSON(this.contentFilePath, validContentData);
    } catch (error) {
      console.error('Failed to save content data:', error);
      return false;
    }
  }

  /**
   * Load combined sticker data (layout + content)
   * @returns {Promise<Array>} Combined sticker data array
   */
  async loadStickerData() {
    try {
      // Check if files exist before trying to load them
      const layoutExists = fs.existsSync(this.layoutFilePath);
      const contentExists = fs.existsSync(this.contentFilePath);

      // If neither file exists, return an empty array without writing anything
      if (!layoutExists && !contentExists) {
        console.log('No sticker data files exist yet, returning empty array');
        return [];
      }

      // Load layout and content data
      const layoutData = await this.loadLayoutData();
      const contentData = await this.loadContentData();

      // Create a map of content by ID for easy lookup
      const contentMap = new Map();
      contentData.forEach(item => {
        if (item && item.id) {
          contentMap.set(item.id, item.content);
        }
      });

      // Merge the data
      const mergedData = layoutData.map(layout => {
        if (!layout || !layout.id) return null;

        return {
          id: layout.id,
          content: contentMap.get(layout.id) || '',
          position: layout.position || { x: 0, y: 0 },
          size: layout.size || { width: 250, height: 80 }
        };
      }).filter(item => item !== null);

      return mergedData;
    } catch (error) {
      console.error('Failed to load sticker data:', error);
      return [];
    }
  }

  /**
   * Update a single sticker's data
   * @param {Object} stickerData - The sticker data to update
   * @returns {Promise<Object>} Status object with success flags
   */
  async updateSticker(stickerData) {
    try {
      if (!stickerData || typeof stickerData !== 'object') {
        return { success: false, error: 'Invalid sticker data provided' };
      }

      // Sanitize the incoming sticker data
      const sanitizedStickerData = {
        id: String(stickerData.id || Date.now()),
        content: String(stickerData.content || ''),
        position: {
          x: Number(stickerData.position?.x || 0),
          y: Number(stickerData.position?.y || 0)
        },
        size: {
          width: Number(stickerData.size?.width || 250),
          height: Number(stickerData.size?.height || 80)
        }
      };

      // Load existing data
      const layoutData = await this.loadLayoutData();
      const contentData = await this.loadContentData();

      // Create backups before updating
      await backupJSONFile(this.layoutFilePath, 'pre-update');
      await backupJSONFile(this.contentFilePath, 'pre-update');

      // Update or add layout data
      const layoutIndex = layoutData.findIndex(item => item && item.id === sanitizedStickerData.id);
      if (layoutIndex !== -1) {
        layoutData[layoutIndex] = {
          id: sanitizedStickerData.id,
          position: sanitizedStickerData.position,
          size: sanitizedStickerData.size
        };
      } else {
        layoutData.push({
          id: sanitizedStickerData.id,
          position: sanitizedStickerData.position,
          size: sanitizedStickerData.size
        });
      }

      // Update or add content data
      const contentIndex = contentData.findIndex(item => item && item.id === sanitizedStickerData.id);
      if (contentIndex !== -1) {
        contentData[contentIndex] = {
          id: sanitizedStickerData.id,
          content: sanitizedStickerData.content
        };
      } else {
        contentData.push({
          id: sanitizedStickerData.id,
          content: sanitizedStickerData.content
        });
      }

      // Save both files
      const layoutSaved = await this.saveLayoutData(layoutData);
      const contentSaved = await this.saveContentData(contentData);

      return {
        success: layoutSaved && contentSaved,
        layoutSaved,
        contentSaved
      };
    } catch (error) {
      console.error('Error updating sticker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove a sticker by ID
   * @param {string} stickerId - ID of the sticker to remove
   * @returns {Promise<Object>} Status object with success flags
   */
  async removeSticker(stickerId) {
    try {
      if (!stickerId) {
        return { success: false, error: 'No sticker ID provided' };
      }

      // Ensure stickerId is a string
      const sanitizedStickerId = String(stickerId);

      // Load existing data
      const layoutData = await this.loadLayoutData();
      const contentData = await this.loadContentData();

      // Create backups before modifying
      await backupJSONFile(this.layoutFilePath, 'pre-delete');
      await backupJSONFile(this.contentFilePath, 'pre-delete');

      // Remove the sticker from both files
      const filteredLayoutData = layoutData.filter(item => item && item.id !== sanitizedStickerId);
      const filteredContentData = contentData.filter(item => item && item.id !== sanitizedStickerId);

      // Save both files
      const layoutSaved = await this.saveLayoutData(filteredLayoutData);
      const contentSaved = await this.saveContentData(filteredContentData);

      return {
        success: layoutSaved && contentSaved,
        layoutSaved,
        contentSaved
      };
    } catch (error) {
      console.error('Error removing sticker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Strip HTML tags from content
   * @param {string} html - HTML content to strip
   * @returns {string} Plain text content
   */
  async stripHtml(html) {
    if (!html) return '';
    // Create a temporary DOM element
    try {
      // Dynamic import for jsdom
      const { JSDOM } = await import('jsdom');
      const tempElement = new JSDOM('').window.document.createElement('div');
      tempElement.innerHTML = html;
      return tempElement.textContent || tempElement.innerText || '';
    } catch (error) {
      console.error('Error stripping HTML:', error);
      // Fallback to basic string replacement if JSDOM fails
      return html.replace(/<[^>]*>/g, '');
    }
  }

  /**
   * Sanitize sticker content to ensure it's safe
   * @param {string} content - Content to sanitize
   * @returns {string} Sanitized content
   */
  async sanitizeContent(content) {
    if (!content) return '';
    return await this.stripHtml(content);
  }
}

export default StickerDataManager;