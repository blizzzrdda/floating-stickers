# File Storage Mechanism

## Overview

The Sticker application uses a file-based storage system to persist sticker data between application sessions. This document details the storage mechanism, file formats, error handling, and recovery procedures.

## Storage Architecture

### File Structure

The application stores data in the user's application data directory:

```
{userData}/
├── stickers-layout.json    # Sticker position and size data
├── stickers-content.json   # Sticker text content
├── preferences.json        # User preferences
├── backups/                # Automatic backups
│   ├── stickers-layout-{timestamp}.json
│   ├── stickers-content-{timestamp}.json
│   └── preferences-{timestamp}.json
└── temp/                   # Temporary files (audio recordings, etc.)
```

Where `{userData}` is the platform-specific user data directory:
- Windows: `%APPDATA%\Sticker`
- macOS: `~/Library/Application Support/Sticker`
- Linux: `~/.config/Sticker`

### File Separation

The application intentionally separates sticker data into two files:

1. **stickers-layout.json**: Contains position and size information
   - Updated frequently during sticker movement and resizing
   - Smaller file size for efficient updates
   - Less critical for data integrity

2. **stickers-content.json**: Contains text content
   - Updated less frequently
   - Potentially larger file size
   - More critical for data integrity

This separation provides several benefits:
- Reduces the risk of data corruption during frequent updates
- Improves performance by minimizing file size for frequent operations
- Allows for independent recovery of layout and content data

## Data Formats

### Layout Data Format

The `stickers-layout.json` file contains an array of sticker layout objects:

```json
[
  {
    "id": "sticker-1234567890",
    "position": {
      "x": 100,
      "y": 200
    },
    "size": {
      "width": 250,
      "height": 150
    }
  },
  {
    "id": "sticker-0987654321",
    "position": {
      "x": 400,
      "y": 300
    },
    "size": {
      "width": 300,
      "height": 200
    }
  }
]
```

### Content Data Format

The `stickers-content.json` file contains an array of sticker content objects:

```json
[
  {
    "id": "sticker-1234567890",
    "content": "This is the content of the first sticker."
  },
  {
    "id": "sticker-0987654321",
    "content": "This is the content of the second sticker."
  }
]
```

### Preferences Format

The `preferences.json` file contains user preferences:

```json
{
  "theme": "light",
  "fontSize": 14,
  "defaultStickerSize": {
    "width": 250,
    "height": 150
  },
  "language": "en",
  "textAppendMode": true,
  "autoSave": true,
  "backupFrequency": "daily"
}
```

## Data Operations

### Reading Data

The application reads data using a robust JSON reading utility:

```javascript
/**
 * Safely read and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {Object} options - Options for reading
 * @returns {Promise<Object>} - Parsed JSON data
 */
async function readJsonFile(filePath, options = {}) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      if (options.createIfNotExists) {
        // Create empty file
        await fs.promises.writeFile(filePath, '[]', 'utf8');
        return [];
      }
      return options.defaultValue || [];
    }

    // Read file
    const data = await fs.promises.readFile(filePath, 'utf8');
    
    // Parse JSON
    try {
      return JSON.parse(data);
    } catch (parseError) {
      console.error(`Error parsing JSON from ${filePath}:`, parseError);
      
      // Attempt recovery
      if (options.attemptRecovery) {
        return await attemptJsonRecovery(filePath, data, options);
      }
      
      // Return default value if recovery fails or is disabled
      return options.defaultValue || [];
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return options.defaultValue || [];
  }
}
```

### Writing Data

The application writes data using a safe JSON writing utility:

```javascript
/**
 * Safely write data to a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {Object} data - Data to write
 * @param {Object} options - Options for writing
 * @returns {Promise<boolean>} - Success status
 */
async function writeJsonFile(filePath, data, options = {}) {
  try {
    // Create backup if enabled
    if (options.createBackup) {
      await createBackup(filePath);
    }
    
    // Ensure directory exists
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Convert data to JSON
    const jsonData = JSON.stringify(data, null, options.pretty ? 2 : 0);
    
    // Write to temporary file first
    const tempFilePath = `${filePath}.tmp`;
    await fs.promises.writeFile(tempFilePath, jsonData, 'utf8');
    
    // Rename temporary file to target file (atomic operation)
    await fs.promises.rename(tempFilePath, filePath);
    
    return true;
  } catch (error) {
    console.error(`Error writing to file ${filePath}:`, error);
    
    // Attempt retry if enabled
    if (options.retry && options.retryCount > 0) {
      console.log(`Retrying write operation (${options.retryCount} attempts left)...`);
      return writeJsonFile(filePath, data, {
        ...options,
        retryCount: options.retryCount - 1
      });
    }
    
    return false;
  }
}
```

### Merging Data

When loading sticker data, the application merges layout and content data:

```javascript
/**
 * Merge layout and content data
 * @param {Array} layoutData - Layout data array
 * @param {Array} contentData - Content data array
 * @returns {Array} - Merged data array
 */
function mergeData(layoutData, contentData) {
  // Create a map of content by ID for efficient lookup
  const contentMap = new Map();
  contentData.forEach(item => {
    contentMap.set(item.id, item.content || '');
  });
  
  // Merge layout with content
  return layoutData.map(layout => {
    return {
      id: layout.id,
      position: layout.position,
      size: layout.size,
      content: contentMap.get(layout.id) || ''
    };
  });
}
```

### Data Validation

The application validates data before reading or writing:

```javascript
/**
 * Validate sticker layout data
 * @param {Object} item - Layout data item
 * @returns {boolean} - Validation result
 */
function validateStickerLayout(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.trim() !== '' &&
    isObject(item.position) &&
    isNumber(item.position.x) &&
    isNumber(item.position.y) &&
    isObject(item.size) &&
    isNumber(item.size.width) &&
    isNumber(item.size.height)
  );
}

/**
 * Validate sticker content data
 * @param {Object} item - Content data item
 * @returns {boolean} - Validation result
 */
function validateStickerContent(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.trim() !== '' &&
    (item.content === undefined || typeof item.content === 'string')
  );
}
```

## Error Handling and Recovery

### Backup System

The application automatically creates backups before writing data:

```javascript
/**
 * Create a backup of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Path to the backup file
 */
async function createBackup(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(path.dirname(filePath), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Generate backup filename with timestamp
    const filename = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${filename.replace('.json', '')}-${timestamp}.json`);
    
    // Copy file to backup
    await fs.promises.copyFile(filePath, backupPath);
    
    // Clean up old backups (keep last 10)
    await cleanupOldBackups(backupDir, filename, 10);
    
    return backupPath;
  } catch (error) {
    console.error(`Error creating backup of ${filePath}:`, error);
    return null;
  }
}
```

### JSON Recovery

The application attempts to recover from corrupted JSON files:

```javascript
/**
 * Attempt to recover corrupted JSON data
 * @param {string} filePath - Path to the corrupted file
 * @param {string} data - Raw file content
 * @param {Object} options - Recovery options
 * @returns {Promise<Object>} - Recovered data or default value
 */
async function attemptJsonRecovery(filePath, data, options = {}) {
  try {
    // Try to find the latest backup
    const backupFile = await findLatestBackup(filePath);
    if (backupFile) {
      console.log(`Attempting recovery from backup: ${backupFile}`);
      const backupData = await fs.promises.readFile(backupFile, 'utf8');
      try {
        return JSON.parse(backupData);
      } catch (parseError) {
        console.error(`Error parsing backup file:`, parseError);
      }
    }
    
    // If no backup or backup is also corrupted, try to fix the JSON
    console.log(`Attempting to fix corrupted JSON in ${filePath}`);
    
    // Try to fix common JSON errors
    const fixedData = fixCommonJsonErrors(data);
    try {
      return JSON.parse(fixedData);
    } catch (parseError) {
      console.error(`Failed to fix JSON:`, parseError);
    }
    
    // If all recovery attempts fail, return default value
    return options.defaultValue || [];
  } catch (error) {
    console.error(`Error during recovery:`, error);
    return options.defaultValue || [];
  }
}
```

### Common JSON Fixes

The application attempts to fix common JSON errors:

```javascript
/**
 * Fix common JSON syntax errors
 * @param {string} data - Raw JSON string
 * @returns {string} - Fixed JSON string
 */
function fixCommonJsonErrors(data) {
  let fixed = data;
  
  // Fix missing quotes around property names
  fixed = fixed.replace(/(\s*)(\w+)(\s*):/g, '$1"$2"$3:');
  
  // Fix trailing commas in arrays and objects
  fixed = fixed.replace(/,(\s*[\]}])/g, '$1');
  
  // Fix missing commas between array elements
  fixed = fixed.replace(/}(\s*){/g, '},$1{');
  
  // Fix unquoted string values
  fixed = fixed.replace(/:(\s*)([^{}\[\]"'\d,\s][^{}\[\]"',\s]*)/g, ':$1"$2"');
  
  // Ensure the data starts with [ and ends with ]
  if (!fixed.trim().startsWith('[')) {
    fixed = '[' + fixed;
  }
  if (!fixed.trim().endsWith(']')) {
    fixed = fixed + ']';
  }
  
  return fixed;
}
```

### Data Consistency Checks

The application performs consistency checks when loading data:

```javascript
/**
 * Check data consistency and repair if needed
 * @param {Array} layoutData - Layout data array
 * @param {Array} contentData - Content data array
 * @returns {Object} - Repaired data
 */
function checkDataConsistency(layoutData, contentData) {
  // Create sets of IDs for quick lookup
  const layoutIds = new Set(layoutData.map(item => item.id));
  const contentIds = new Set(contentData.map(item => item.id));
  
  // Find content items without layout
  const orphanedContentIds = [...contentIds].filter(id => !layoutIds.has(id));
  
  // Find layout items without content
  const layoutWithoutContentIds = [...layoutIds].filter(id => !contentIds.has(id));
  
  // Log inconsistencies
  if (orphanedContentIds.length > 0) {
    console.warn(`Found ${orphanedContentIds.length} content items without layout`);
  }
  
  if (layoutWithoutContentIds.length > 0) {
    console.warn(`Found ${layoutWithoutContentIds.length} layout items without content`);
    
    // Create missing content items
    const missingContent = layoutWithoutContentIds.map(id => ({
      id,
      content: ''
    }));
    
    // Add missing content items
    contentData = [...contentData, ...missingContent];
  }
  
  return {
    layoutData,
    contentData,
    repaired: orphanedContentIds.length > 0 || layoutWithoutContentIds.length > 0
  };
}
```

## Temporary File Management

### Audio Recording Storage

The application stores temporary audio recordings in the temp directory:

```javascript
/**
 * Save recorded audio to a temporary file
 * @param {Object} audioData - Audio data object
 * @returns {Promise<Object>} - Result with file path
 */
async function saveRecordedAudio(audioData) {
  try {
    // Ensure temp directory exists
    const tempDir = path.join(app.getPath('temp'), 'sticker-audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `recording-${timestamp}.webm`;
    const filePath = path.join(tempDir, filename);
    
    // Decode base64 data
    const buffer = Buffer.from(audioData.data, 'base64');
    
    // Write to file
    fs.writeFileSync(filePath, buffer);
    
    return {
      success: true,
      filePath,
      size: buffer.length
    };
  } catch (error) {
    console.error('Error saving recorded audio:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Cleanup of Temporary Files

The application periodically cleans up old temporary files:

```javascript
/**
 * Clean up old temporary files
 * @param {number} maxAgeHours - Maximum age in hours
 * @returns {Promise<number>} - Number of files deleted
 */
async function cleanupTempFiles(maxAgeHours = 24) {
  try {
    const tempDir = path.join(app.getPath('temp'), 'sticker-audio');
    if (!fs.existsSync(tempDir)) {
      return 0;
    }
    
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      // Check if file is older than maxAgeHours
      const fileAge = now - stats.mtime.getTime();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      
      if (fileAge > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
    return 0;
  }
}
```

## Performance Considerations

### Caching

The application implements a simple in-memory cache to reduce disk I/O:

```javascript
// Simple in-memory cache
const cache = new Map();

/**
 * Get data from cache or load from disk
 * @param {string} key - Cache key
 * @param {Function} loader - Function to load data if not in cache
 * @param {Object} options - Cache options
 * @returns {Promise<Object>} - Data
 */
async function getCachedData(key, loader, options = {}) {
  // Check if data is in cache and not expired
  if (cache.has(key)) {
    const { data, timestamp } = cache.get(key);
    const now = Date.now();
    const maxAge = options.maxAge || 5 * 60 * 1000; // Default: 5 minutes
    
    if (now - timestamp < maxAge) {
      return data;
    }
  }
  
  // Load data
  const data = await loader();
  
  // Cache data
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  return data;
}
```

### Debouncing

The application uses debouncing to reduce the frequency of file operations:

```javascript
/**
 * Create a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Example usage
const debouncedSaveLayout = debounce(saveLayoutData, 300);
```

## Security Considerations

### Data Sanitization

The application sanitizes data before saving:

```javascript
/**
 * Sanitize sticker data
 * @param {Object} data - Sticker data
 * @returns {Object} - Sanitized data
 */
function sanitizeSticker(data) {
  // Create a new object to avoid modifying the original
  const sanitized = {
    id: String(data.id || Date.now()),
    content: typeof data.content === 'string' ? data.content : '',
    position: {
      x: Number(data.position?.x || 0),
      y: Number(data.position?.y || 0)
    },
    size: {
      width: Number(data.size?.width || 250),
      height: Number(data.size?.height || 80)
    }
  };
  
  // Apply constraints
  sanitized.position.x = Math.max(0, sanitized.position.x);
  sanitized.position.y = Math.max(0, sanitized.position.y);
  sanitized.size.width = Math.max(100, Math.min(2000, sanitized.size.width));
  sanitized.size.height = Math.max(80, Math.min(2000, sanitized.size.height));
  
  return sanitized;
}
```

### Content Sanitization

The application sanitizes user-entered content:

```javascript
/**
 * Sanitize text content
 * @param {string} content - Raw content
 * @returns {string} - Sanitized content
 */
function sanitizeContent(content) {
  if (typeof content !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous HTML
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
}
```

## Migration and Versioning

### Data Version Tracking

The application tracks data format versions:

```javascript
/**
 * Check and migrate data format if needed
 * @param {Object} data - Data to check
 * @returns {Object} - Migrated data
 */
function migrateDataIfNeeded(data) {
  // Check if data has version information
  if (!data.version) {
    // Apply migration for pre-versioned data
    return migrateFromLegacyFormat(data);
  }
  
  // Check version and apply migrations as needed
  switch (data.version) {
    case 1:
      data = migrateFromV1ToV2(data);
      // Fall through to next case
    case 2:
      data = migrateFromV2ToV3(data);
      break;
    // Add more cases as new versions are introduced
  }
  
  return data;
}
```

### Legacy Data Support

The application supports loading legacy data formats:

```javascript
/**
 * Migrate from legacy format (single file) to split format
 * @param {Object} legacyData - Legacy data
 * @returns {Object} - Migrated data
 */
function migrateFromLegacyFormat(legacyData) {
  // Extract layout and content data
  const layoutData = legacyData.map(item => ({
    id: item.id,
    position: item.position,
    size: item.size
  }));
  
  const contentData = legacyData.map(item => ({
    id: item.id,
    content: item.content || ''
  }));
  
  // Save migrated data
  saveLayoutData(layoutData);
  saveContentData(contentData);
  
  return {
    layoutData,
    contentData
  };
}
```

## Conclusion

The Sticker application's file storage mechanism is designed to be robust, efficient, and resilient to errors. By separating layout and content data, implementing comprehensive error handling and recovery procedures, and optimizing performance through caching and debouncing, the application provides a reliable storage solution for user data.
