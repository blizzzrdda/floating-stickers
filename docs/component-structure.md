# Sticker Application Component Structure

## Overview

The Sticker application follows a modular architecture based on the Electron framework, which separates the application into a main process and multiple renderer processes. This document details the component structure, responsibilities, and relationships between different parts of the application.

## Main Process Components

The main process serves as the core of the application, managing windows, system integration, and data persistence.

### Core Components

#### Application Manager (`electron-main.js`)

**Purpose**: Serves as the entry point and central coordinator for the application.

**Responsibilities**:
- Initialize the application
- Create and manage the main window (hidden)
- Set up the system tray
- Register global shortcuts
- Initialize services
- Load saved stickers on startup

**Dependencies**:
- Electron framework
- StickerDataManager
- WhisperService
- AudioRecordingService
- PreferencesService

#### Window Manager

**Purpose**: Manages the creation, positioning, and lifecycle of sticker windows.

**Responsibilities**:
- Create new sticker windows
- Position stickers on the screen
- Handle window events (move, resize, close)
- Manage sticker visibility
- Realign stickers when requested

**Dependencies**:
- Electron's BrowserWindow
- StickerDataManager

### Services

#### StickerDataManager

**Purpose**: Manages the persistence and retrieval of sticker data.

**Responsibilities**:
- Load sticker data from disk
- Save sticker data to disk
- Update individual stickers
- Handle data validation and sanitization
- Provide error recovery mechanisms

**Dependencies**:
- JsonUtils
- FileUtils
- ContentLoader
- ContentRecovery

#### WhisperService

**Purpose**: Provides speech-to-text functionality using OpenAI's Whisper API.

**Responsibilities**:
- Initialize the OpenAI client
- Prepare audio data for transcription
- Send audio to the Whisper API
- Process transcription responses
- Handle API errors and timeouts

**Dependencies**:
- OpenAI API
- FileSystem utilities

#### AudioRecordingService

**Purpose**: Manages audio recording operations in the main process.

**Responsibilities**:
- Initialize temporary directories
- Save recorded audio data
- Delete temporary audio files
- Check microphone permissions
- Clean up old temporary files

**Dependencies**:
- FileSystem utilities
- Electron's ipcMain

#### PreferencesService

**Purpose**: Manages user preferences for the application.

**Responsibilities**:
- Load user preferences from disk
- Save user preferences to disk
- Provide default preferences
- Validate preference data

**Dependencies**:
- JsonUtils
- FileUtils

### Utilities

#### JsonUtils

**Purpose**: Provides robust JSON file operations.

**Responsibilities**:
- Safely read JSON files
- Safely write JSON files
- Handle JSON parsing errors
- Create backups of JSON files
- Validate JSON data

**Dependencies**:
- FileUtils

#### FileUtils

**Purpose**: Provides safe file system operations.

**Responsibilities**:
- Safely read files
- Safely write files
- Create file backups
- Ensure directories exist
- Delete files safely

**Dependencies**:
- Node.js fs module

#### Logger

**Purpose**: Provides logging functionality.

**Responsibilities**:
- Log messages at different levels (debug, info, warn, error)
- Format log messages
- Filter logs based on level
- Direct logs to appropriate outputs

**Dependencies**:
- None

## Renderer Process Components

Each sticker is rendered in its own window with its own renderer process.

### Sticker UI Components

#### Sticker Container

**Purpose**: Serves as the main container for a sticker.

**Responsibilities**:
- Render the sticker UI
- Handle drag operations
- Manage sticker state
- Communicate with the main process

**Dependencies**:
- Sticker Header
- Sticker Content
- Microphone Button

#### Sticker Header

**Purpose**: Provides the header area of a sticker.

**Responsibilities**:
- Serve as a drag handle
- Contain the close button
- Handle close operations

**Dependencies**:
- None

#### Sticker Content

**Purpose**: Manages the editable content area of a sticker.

**Responsibilities**:
- Render sticker text content
- Handle content editing
- Manage content state
- Auto-resize based on content

**Dependencies**:
- None

#### Microphone Button

**Purpose**: Provides speech-to-text functionality in the sticker UI.

**Responsibilities**:
- Toggle audio recording
- Display recording status
- Initiate transcription process
- Insert transcribed text into sticker

**Dependencies**:
- AudioRecorder
- IPC communication with WhisperService

### Renderer Services

#### AudioRecorder

**Purpose**: Manages audio recording in the renderer process.

**Responsibilities**:
- Initialize audio recording
- Capture audio from microphone
- Handle recording start/stop
- Process recorded audio
- Send audio data to main process

**Dependencies**:
- Browser's MediaRecorder API
- IPC communication with AudioRecordingService

## Communication Flow

### IPC Communication

The application uses Electron's IPC (Inter-Process Communication) mechanism for communication between the main process and renderer processes.

#### Main to Renderer
- Send sticker data to sticker windows
- Update sticker position and size
- Notify of transcription results

#### Renderer to Main
- Update sticker content
- Request sticker removal
- Save recorded audio
- Request transcription
- Get user preferences

### Data Flow

1. **Sticker Creation**:
   - User requests new sticker (UI or shortcut)
   - Main process creates sticker window
   - Sticker window loads with default data
   - User edits sticker content
   - Content changes sent to main process
   - Main process saves data to disk

2. **Sticker Loading**:
   - Application starts
   - Main process loads sticker data
   - Main process creates sticker windows
   - Sticker data sent to each window
   - Sticker windows render with loaded data

3. **Speech-to-Text**:
   - User clicks microphone button
   - Renderer process starts recording
   - Audio data sent to main process
   - Main process saves audio to temp file
   - Main process sends audio to Whisper API
   - Transcription result sent back to renderer
   - Renderer updates sticker content
   - Content changes sent to main process
   - Main process saves data to disk

## Component Lifecycle

### Application Lifecycle
1. Application starts
2. Main process initializes
3. Services are initialized
4. Saved stickers are loaded
5. Sticker windows are created
6. User interacts with stickers
7. Application minimizes to tray when closed
8. Application quits when exit is selected from tray

### Sticker Lifecycle
1. Sticker is created
2. Sticker window loads
3. Sticker receives initial data
4. User edits sticker content
5. Sticker content is saved
6. Sticker is closed/removed
7. Sticker data is deleted

## Error Handling

The application implements robust error handling throughout its components:

- **StickerDataManager**: Handles data loading/saving errors with recovery mechanisms
- **WhisperService**: Handles API errors and timeouts
- **AudioRecordingService**: Handles file system errors
- **Renderer Process**: Handles UI errors with fallbacks

## Testing Structure

The application includes a comprehensive testing framework:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test interactions between components
- **End-to-End Tests**: Test complete user workflows

Tests are organized by feature and component, with specific tests for error conditions and edge cases.
