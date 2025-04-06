const fs = require('fs');
const path = require('path');
const { safeReadJSON, safeWriteJSON, backupJSONFile } = require('./jsonUtils');

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
    this.legacyFilePath = path.join(userDataPath, 'stickers.json');
    this.layoutFilePath = path.join(userDataPath, 'stickers-layout.json');
    this.contentFilePath = path.join(userDataPath, 'stickers-content.json');
  }

  /**
   * Migrate from legacy format to the new split format
   * @returns {Promise<boolean>} Success status
   */
  async migrateFromLegacyFormat() {
    try {
      // Check if old file exists but new files don't
      const oldExists = fs.existsSync(this.legacyFilePath);
      const layoutExists = fs.existsSync(this.layoutFilePath);
      const contentExists = fs.existsSync(this.contentFilePath);
      
      if (oldExists && (!layoutExists || !contentExists)) {
        console.log('Migrating stickers data to new format...');
        
        // Read the old file
        const oldData = await safeReadJSON(this.legacyFilePath, []);
        
        if (oldData.length === 0) {
          // Nothing to migrate
          await safeWriteJSON(this.layoutFilePath, []);
          await safeWriteJSON(this.contentFilePath, []);
          return true;
        }
        
        // Create the new format data
        const layoutData = oldData.map(sticker => ({
          id: String(sticker.id || Date.now()),
          position: {
            x: Number(sticker.position?.x || 0),
            y: Number(sticker.position?.y || 0)
          },
          size: {
            width: Number(sticker.size?.width || 250),
            height: Number(sticker.size?.height || 80)
          }
        }));
        
        const contentData = oldData.map(sticker => ({
          id: String(sticker.id || Date.now()),
          content: String(sticker.content || '')
        }));
        
        // Write the new files
        await safeWriteJSON(this.layoutFilePath, layoutData);
        await safeWriteJSON(this.contentFilePath, contentData);
        
        // Backup and rename the old file
        const backupPath = `${this.legacyFilePath}.migrated-${Date.now()}`;
        await fs.promises.rename(this.legacyFilePath, backupPath);
        console.log(`Migration complete. Old data backed up to ${backupPath}`);
        
        return true;
      }
      
      // No migration needed
      return true;
    } catch (error) {
      console.error('Error during migration:', error);
      return false;
    }
  }

  /**
   * Load sticker layout data
   * @returns {Promise<Array>} Layout data array
   */
  async loadLayoutData() {
    return await safeReadJSON(this.layoutFilePath, []);
  }

  /**
   * Load sticker content data
   * @returns {Promise<Array>} Content data array
   */
  async loadContentData() {
    return await safeReadJSON(this.contentFilePath, []);
  }

  /**
   * Save sticker layout data
   * @param {Array} layoutData - Array of sticker layout objects
   * @returns {Promise<boolean>} Success status
   */
  async saveLayoutData(layoutData) {
    return await safeWriteJSON(this.layoutFilePath, layoutData);
  }

  /**
   * Save sticker content data
   * @param {Array} contentData - Array of sticker content objects
   * @returns {Promise<boolean>} Success status
   */
  async saveContentData(contentData) {
    return await safeWriteJSON(this.contentFilePath, contentData);
  }

  /**
   * Load combined sticker data (layout + content)
   * @returns {Promise<Array>} Combined sticker data array
   */
  async loadStickerData() {
    // Load layout and content data
    const layoutData = await this.loadLayoutData();
    const contentData = await this.loadContentData();
    
    // Create a map of content by ID for easy lookup
    const contentMap = new Map();
    contentData.forEach(item => {
      contentMap.set(item.id, item.content);
    });
    
    // Merge the data
    const mergedData = layoutData.map(layout => {
      return {
        id: layout.id,
        content: contentMap.get(layout.id) || '',
        position: layout.position,
        size: layout.size
      };
    });
    
    return mergedData;
  }

  /**
   * Update a single sticker's data
   * @param {Object} stickerData - The sticker data to update
   * @returns {Promise<Object>} Status object with success flags
   */
  async updateSticker(stickerData) {
    try {
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
      
      // Update or add layout data
      const layoutIndex = layoutData.findIndex(item => item.id === sanitizedStickerData.id);
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
      const contentIndex = contentData.findIndex(item => item.id === sanitizedStickerData.id);
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
      // Ensure stickerId is a string
      const sanitizedStickerId = String(stickerId);
      
      // Load existing data
      const layoutData = await this.loadLayoutData();
      const contentData = await this.loadContentData();
      
      // Remove the sticker from both files
      const filteredLayoutData = layoutData.filter(item => item.id !== sanitizedStickerId);
      const filteredContentData = contentData.filter(item => item.id !== sanitizedStickerId);
      
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
  stripHtml(html) {
    if (!html) return '';
    // Create a temporary DOM element
    const tempElement = new (require('jsdom').JSDOM)('').window.document.createElement('div');
    tempElement.innerHTML = html;
    return tempElement.textContent || tempElement.innerText || '';
  }

  /**
   * Sanitize sticker content to ensure it's safe
   * @param {string} content - Content to sanitize
   * @returns {string} Sanitized content
   */
  sanitizeContent(content) {
    if (!content) return '';
    return this.stripHtml(content);
  }
}

module.exports = StickerDataManager; 