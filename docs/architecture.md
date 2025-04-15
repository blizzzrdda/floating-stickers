# Sticker Application Architecture

## Overview

The Sticker application is a desktop application built with Electron that allows users to create and manage floating sticky notes on their screen. The application uses a main process for core functionality and renderer processes for each sticker window.

## Components

### Main Process

The main process (`electron-main.js`) is responsible for:

- Application initialization
- Window management
- IPC (Inter-Process Communication) handling
- Global shortcuts
- System tray integration
- Data persistence

### Renderer Processes

Each sticker has its own renderer process (`sticker.html`) that handles:

- User interface rendering
- Content editing
- Speech-to-text integration
- Local state management

### Services

The application uses several services for specific functionality:

- **WhisperService**: Handles speech-to-text conversion using OpenAI's Whisper API
- **AudioRecordingService**: Manages audio recording for speech-to-text
- **PreferencesService**: Manages user preferences

### Utilities

The application includes several utility modules:

- **StickerDataManager**: Manages loading and saving sticker data
- **JsonUtils**: Handles JSON file operations with robust error handling
- **DebugUtils**: Provides logging and debugging functionality
- **Environment**: Detects the current environment (development, test, production)

## Data Flow

1. The main process initializes the application and loads saved sticker data
2. Sticker windows are created for each saved sticker
3. Each sticker window receives its data via IPC
4. User interactions in sticker windows are sent back to the main process via IPC
5. The main process updates the data store and persists changes to disk

## Data Storage

Sticker data is stored in two separate JSON files:

- `stickers-layout.json`: Contains position and size information for each sticker
- `stickers-content.json`: Contains the text content for each sticker

This separation allows for efficient updates and reduces the risk of data corruption.

## Testing

The application includes a test framework that runs only in development mode:

- Unit tests for individual components
- Integration tests for testing multiple components together
- Test utilities for environment detection and conditional test loading

## Error Handling

The application implements robust error handling:

- JSON file operations include comprehensive error handling and recovery
- IPC communications include error handling
- UI operations include fallbacks for error conditions

## Debugging

The application includes a debugging system that:

- Logs detailed information about application operations
- Can be enabled/disabled based on the environment
- Includes different log levels (debug, info, warn, error)
- Helps diagnose issues in development

## Speech-to-Text Integration

The application integrates with OpenAI's Whisper API for speech-to-text:

1. Audio is recorded using the browser's MediaRecorder API
2. Audio data is sent to the main process
3. The main process sends the audio to the Whisper API
4. Transcription results are sent back to the sticker window
5. The sticker window updates its content with the transcription

## Future Improvements

Potential areas for improvement include:

- Enhanced error recovery mechanisms
- More comprehensive testing
- Performance optimizations
- Additional features like formatting options
- Cloud synchronization
