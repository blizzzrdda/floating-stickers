/**
 * Web Worker for CPU-intensive tasks
 * This worker handles tasks that would otherwise block the main thread
 */

// Handle messages from the main thread
self.onmessage = function(event) {
  const { id, type, data } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'sanitize-text':
        result = sanitizeText(data.text);
        break;
        
      case 'process-content':
        result = processContent(data.content);
        break;
        
      case 'calculate-layout':
        result = calculateLayout(data.stickers);
        break;
        
      case 'validate-data':
        result = validateData(data.value, data.schema);
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    // Send successful result back to main thread
    self.postMessage({
      id,
      type,
      success: true,
      result
    });
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      id,
      type,
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};

/**
 * Sanitize text content
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove any HTML tags
  const sanitized = text.replace(/<[^>]*>/g, '');
  
  return sanitized;
}

/**
 * Process content for display
 * @param {string} content - Content to process
 * @returns {Object} - Processed content information
 */
function processContent(content) {
  if (typeof content !== 'string') {
    content = '';
  }
  
  // Calculate content metrics
  const lines = content.split(/\\r?\\n/);
  const wordCount = content.split(/\\s+/).filter(Boolean).length;
  const charCount = content.length;
  
  // Calculate estimated height based on content
  const lineHeight = 20; // Approximate line height in pixels
  const headerHeight = 36; // Header height
  const contentPadding = 20; // Content padding (10px top + 10px bottom)
  const extraPadding = 2; // Extra space to prevent cutting off text
  
  // Calculate the total height needed
  const estimatedHeight = headerHeight + (lines.length * lineHeight) + contentPadding + extraPadding;
  
  return {
    lines: lines.length,
    wordCount,
    charCount,
    estimatedHeight
  };
}

/**
 * Calculate optimal layout for multiple stickers
 * @param {Array} stickers - Array of sticker data
 * @returns {Array} - Stickers with updated positions
 */
function calculateLayout(stickers) {
  if (!Array.isArray(stickers) || stickers.length === 0) {
    return [];
  }
  
  // Clone the stickers to avoid modifying the original
  const stickersCopy = JSON.parse(JSON.stringify(stickers));
  
  // Sort stickers by position (top to bottom, left to right)
  stickersCopy.sort((a, b) => {
    if (a.position.y !== b.position.y) {
      return a.position.y - b.position.y;
    }
    return a.position.x - b.position.x;
  });
  
  // Grid settings
  const gridSize = 20;
  const margin = 10;
  
  // Calculate new positions
  let currentRow = 0;
  let currentX = margin;
  let maxHeightInRow = 0;
  
  stickersCopy.forEach((sticker, index) => {
    // If this sticker would go beyond the right edge, move to next row
    if (index > 0 && currentX + sticker.size.width > 1200) { // Assume 1200px max width
      currentRow++;
      currentX = margin;
      maxHeightInRow = 0;
    }
    
    // Set new position
    sticker.position.x = currentX;
    sticker.position.y = currentRow * gridSize + margin;
    
    // Update for next sticker
    currentX += sticker.size.width + margin;
    maxHeightInRow = Math.max(maxHeightInRow, sticker.size.height);
  });
  
  return stickersCopy;
}

/**
 * Validate data against a schema
 * @param {any} value - Value to validate
 * @param {Object} schema - Schema to validate against
 * @returns {Object} - Validation result
 */
function validateData(value, schema) {
  // Simple schema validation
  const errors = [];
  
  if (!schema || typeof schema !== 'object') {
    throw new Error('Invalid schema');
  }
  
  // Check type
  if (schema.type) {
    const valueType = Array.isArray(value) ? 'array' : typeof value;
    if (valueType !== schema.type && !(schema.type === 'array' && Array.isArray(value))) {
      errors.push(`Expected type ${schema.type}, got ${valueType}`);
    }
  }
  
  // Check required properties
  if (schema.required && Array.isArray(schema.required) && typeof value === 'object' && value !== null) {
    for (const prop of schema.required) {
      if (!(prop in value)) {
        errors.push(`Missing required property: ${prop}`);
      }
    }
  }
  
  // Check properties
  if (schema.properties && typeof value === 'object' && value !== null) {
    for (const [prop, propSchema] of Object.entries(schema.properties)) {
      if (prop in value) {
        const propResult = validateData(value[prop], propSchema);
        if (!propResult.valid) {
          errors.push(...propResult.errors.map(err => `${prop}: ${err}`));
        }
      }
    }
  }
  
  // Check array items
  if (schema.items && Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const itemResult = validateData(value[i], schema.items);
      if (!itemResult.valid) {
        errors.push(...itemResult.errors.map(err => `[${i}]: ${err}`));
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
