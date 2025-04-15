# Data Flow and State Management

## Overview

The Sticker application implements a distributed state management approach where state is managed across the main process and multiple renderer processes. This document details how data flows through the application and how state is managed at different levels.

## State Management Architecture

The application uses a hybrid state management approach:

1. **Main Process State**: Centralized state for application-level data
2. **Renderer Process State**: Local state for individual sticker windows
3. **Persistent State**: Data stored on disk for persistence across sessions

## Main Process State

### Core State

The main process maintains several key state objects:

- **Sticker Windows Map**: A Map object that tracks all open sticker windows
  ```javascript
  // Map of sticker ID to BrowserWindow instance
  const stickerWindows = new Map();
  ```

- **Application State**: Tracks the overall application state
  ```javascript
  let isQuitting = false;
  let areStickersVisible = true;
  ```

- **Services State**: References to initialized services
  ```javascript
  let stickerManager = null;
  let whisperService = null;
  let audioRecordingService = null;
  let preferencesService = null;
  ```

### State Management

The main process manages state through direct variable manipulation and function calls. It does not use a formal state management library, but instead follows a procedural approach:

```javascript
// Example: Toggle stickers visibility
function toggleStickersVisibility() {
  areStickersVisible = !areStickersVisible;
  
  stickerWindows.forEach(win => {
    if (areStickersVisible) {
      win.show();
    } else {
      win.hide();
    }
  });
}
```

### State Persistence

The main process is responsible for persisting state to disk through the StickerDataManager:

```javascript
// Example: Save sticker data
async function saveStickers() {
  // Collect data from all sticker windows
  const stickersData = [];
  
  stickerWindows.forEach((win, id) => {
    // Get position and size
    const bounds = win.getBounds();
    
    stickersData.push({
      id,
      position: { x: bounds.x, y: bounds.y },
      size: { width: bounds.width, height: bounds.height },
      content: stickerContents.get(id) || ''
    });
  });
  
  // Save to disk
  await stickerManager.saveStickers(stickersData);
}
```

## Renderer Process State

Each sticker window maintains its own local state:

### Local State Variables

```javascript
// Example: Sticker local state
let stickerData = {
  id: '',
  content: '',
  position: { x: 0, y: 0 },
  size: { width: 250, height: 80 }
};

let isEditing = false;
let isRecording = false;
```

### State Updates

Renderer processes update their local state based on:

1. **User Interactions**: Direct manipulation of the UI
2. **IPC Messages**: Updates from the main process
3. **Window Events**: Events like resize or move

```javascript
// Example: Update content on user input
content.addEventListener('input', debounce(() => {
  // Update local state
  stickerData.content = content.textContent;
  
  // Save changes
  debouncedSaveSticker();
}, 100));

// Example: Receive position updates from main process
window.stickerAPI.onPositionUpdated(position => {
  if (position && position.x !== undefined && position.y !== undefined) {
    // Update local state
    stickerData.position = position;
    saveSticker();
  }
});
```

### State Synchronization

Renderer processes synchronize their state with the main process through IPC:

```javascript
// Example: Save sticker data to main process
function saveSticker() {
  window.stickerAPI.updateSticker(stickerData)
    .then(result => {
      if (!result.success) {
        console.error('Failed to save sticker:', result.error);
      }
    })
    .catch(err => {
      console.error('Error saving sticker:', err);
    });
}
```

## Data Flow

### Application Startup Flow

1. **Application Initialization**:
   ```
   Start Application
   ↓
   Initialize Main Process
   ↓
   Create Main Window (Hidden)
   ↓
   Create System Tray
   ↓
   Initialize Services
   ↓
   Load Saved Stickers
   ↓
   Create Sticker Windows
   ```

2. **Sticker Data Loading**:
   ```
   Load Saved Stickers
   ↓
   Read Layout Data (stickers-layout.json)
   ↓
   Read Content Data (stickers-content.json)
   ↓
   Merge Layout and Content Data
   ↓
   Create Sticker Windows with Merged Data
   ```

### User Interaction Flow

1. **Creating a New Sticker**:
   ```
   User Action (Menu/Shortcut)
   ↓
   Main Process Creates Sticker Window
   ↓
   Sticker Window Initializes with Default Data
   ↓
   Main Process Updates Layout Data
   ↓
   Main Process Saves Layout Data to Disk
   ```

2. **Editing Sticker Content**:
   ```
   User Edits Content
   ↓
   Renderer Process Updates Local State
   ↓
   Renderer Process Sends Update to Main Process
   ↓
   Main Process Updates Content Data
   ↓
   Main Process Saves Content Data to Disk
   ```

3. **Moving/Resizing a Sticker**:
   ```
   User Moves/Resizes Sticker
   ↓
   Window Emits Move/Resize Event
   ↓
   Main Process Updates Layout Data
   ↓
   Main Process Sends Position/Size to Renderer
   ↓
   Renderer Process Updates Local State
   ↓
   Main Process Saves Layout Data to Disk
   ```

4. **Speech-to-Text Flow**:
   ```
   User Clicks Microphone Button
   ↓
   Renderer Process Starts Recording
   ↓
   User Speaks and Stops Recording
   ↓
   Renderer Process Sends Audio to Main Process
   ↓
   Main Process Saves Audio to Temp File
   ↓
   Main Process Sends Audio to Whisper API
   ↓
   Whisper API Returns Transcription
   ↓
   Main Process Sends Transcription to Renderer
   ↓
   Renderer Process Updates Content
   ↓
   Renderer Process Sends Update to Main Process
   ↓
   Main Process Saves Content Data to Disk
   ```

5. **Closing a Sticker**:
   ```
   User Clicks Close Button
   ↓
   Renderer Process Sends Remove Request to Main Process
   ↓
   Main Process Removes Sticker from Data
   ↓
   Main Process Closes Sticker Window
   ↓
   Main Process Saves Updated Data to Disk
   ```

### Error Handling Flow

1. **Data Loading Error**:
   ```
   Error Loading Data
   ↓
   Attempt Recovery from Backup
   ↓
   If Recovery Fails, Create Empty Data
   ↓
   Log Error and Continue
   ```

2. **Data Saving Error**:
   ```
   Error Saving Data
   ↓
   Retry Save Operation
   ↓
   If Retry Fails, Log Error
   ↓
   Continue Operation with Warning
   ```

3. **API Error (Speech-to-Text)**:
   ```
   Error Calling Whisper API
   ↓
   Categorize Error (Network, Authentication, etc.)
   ↓
   Retry with Exponential Backoff
   ↓
   If Retry Fails, Return Error to Renderer
   ↓
   Renderer Displays Error Message
   ```

## State Synchronization Mechanisms

### IPC Channels

The application uses several IPC channels for state synchronization:

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `sticker-data` | Main → Renderer | Send initial sticker data |
| `position-updated` | Main → Renderer | Notify of position changes |
| `size-updated` | Main → Renderer | Notify of size changes |
| `update-sticker` | Renderer → Main | Update sticker data |
| `remove-sticker` | Renderer → Main | Request sticker removal |
| `save-recorded-audio` | Renderer → Main | Save audio recording |
| `transcribe-audio` | Renderer → Main | Request transcription |

### Debouncing and Throttling

To prevent excessive state updates and disk operations, the application implements:

1. **Debouncing**: For content changes
   ```javascript
   content.addEventListener('input', debounce(() => {
     // Update state and save
   }, 100));
   ```

2. **Throttling**: For position/size changes
   ```javascript
   const debouncedSaveSticker = debounce(saveSticker, 300);
   ```

## Caching

The application implements a simple caching mechanism to reduce disk I/O:

```javascript
// Generate a cache key based on file paths
const cacheKey = `sticker-data:${this.layoutFilePath}:${this.contentFilePath}`;

// Check cache first
if (!options.bypassCache && globalCache.has(cacheKey)) {
  const cachedData = globalCache.get(cacheKey);
  logger.debug(`Using cached sticker data (${cachedData.length} items)`);
  return cachedData;
}

// Cache the merged data for future use
globalCache.set(cacheKey, mergedData);
```

## State Validation

The application validates state at multiple levels:

1. **Input Validation**: Sanitize user input
   ```javascript
   function sanitizeContent() {
     // Remove any HTML tags or unsafe content
     const sanitized = content.textContent.replace(/[<>]/g, '');
     content.textContent = sanitized;
   }
   ```

2. **Data Validation**: Validate data structure
   ```javascript
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
   ```

3. **Constraint Validation**: Enforce value constraints
   ```javascript
   // Apply width and height with validation
   const width = Math.max(100, Math.min(2000, sanitizedData.size.width));
   const height = Math.max(80, Math.min(2000, sanitizedData.size.height));
   ```

## Best Practices

The application follows several state management best practices:

1. **Single Source of Truth**: The main process is the authoritative source for sticker data
2. **Immutable Updates**: Create new objects when updating state
3. **Validation**: Validate data before updating state
4. **Error Recovery**: Implement robust error handling and recovery mechanisms
5. **Optimistic Updates**: Update UI immediately, then confirm with the main process
6. **Debouncing**: Prevent excessive updates for better performance
7. **Caching**: Reduce disk I/O with in-memory caching
