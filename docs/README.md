# Sticker Application Documentation

## Overview

This documentation provides a comprehensive guide to the Sticker application's architecture, components, and functionality. The Sticker application is a desktop application built with Electron that allows users to create and manage floating sticky notes on their screen.

## Table of Contents

1. [Architecture](architecture.md)
2. [Component Structure](component-structure.md)
3. [Data Flow and State Management](data-flow-state-management.md)
4. [File Storage Mechanism](file-storage-mechanism.md)
5. [Speech-to-Text Integration](speech-to-text-integration.md)
6. [Architecture Diagrams](architecture-diagram.md)
7. [User Guides](#user-guides)
8. [Developer Guides](#developer-guides)

## Key Features

- Create transparent, frameless sticky notes that float on your desktop
- Notes persist between application restarts
- Drag notes anywhere on your screen
- Auto-alignment of new stickers in a vertical stack
- Resize notes as needed
- System tray icon for easy management
- Speech-to-text functionality using OpenAI's Whisper API

## Architecture Overview

The Sticker application follows a modular architecture based on the Electron framework, which separates the application into a main process and multiple renderer processes:

- **Main Process**: Handles application initialization, window management, IPC handling, global shortcuts, system tray integration, and data persistence.
- **Renderer Processes**: Each sticker has its own renderer process that handles user interface rendering, content editing, speech-to-text integration, and local state management.
- **Services**: The application uses several services for specific functionality, including WhisperService, AudioRecordingService, and PreferencesService.
- **Utilities**: The application includes several utility modules for JSON operations, file system operations, logging, and debugging.

For more details, see the [Architecture](architecture.md) document.

## Component Structure

The application is organized into several key components:

- **Application Manager**: Serves as the entry point and central coordinator for the application.
- **Window Manager**: Manages the creation, positioning, and lifecycle of sticker windows.
- **StickerDataManager**: Manages the persistence and retrieval of sticker data.
- **WhisperService**: Provides speech-to-text functionality using OpenAI's Whisper API.
- **AudioRecordingService**: Manages audio recording operations in the main process.
- **Sticker UI Components**: Includes Sticker Container, Sticker Header, Sticker Content, and Microphone Button.

For more details, see the [Component Structure](component-structure.md) document.

## Data Flow and State Management

The application uses a hybrid state management approach:

1. **Main Process State**: Centralized state for application-level data
2. **Renderer Process State**: Local state for individual sticker windows
3. **Persistent State**: Data stored on disk for persistence across sessions

For more details, see the [Data Flow and State Management](data-flow-state-management.md) document.

## File Storage Mechanism

The application uses a file-based storage system to persist sticker data between application sessions:

- **stickers-layout.json**: Contains position and size information
- **stickers-content.json**: Contains text content
- **preferences.json**: Contains user preferences

For more details, see the [File Storage Mechanism](file-storage-mechanism.md) document.

## Speech-to-Text Integration

The application integrates OpenAI's Whisper API to provide speech-to-text functionality:

1. Audio is recorded using the browser's MediaRecorder API
2. Audio data is sent to the main process
3. The main process sends the audio to the Whisper API
4. Transcription results are sent back to the sticker window
5. The sticker window updates its content with the transcription

For more details, see the [Speech-to-Text Integration](speech-to-text-integration.md) document.

## User Guides

### Getting Started

1. **Installation**: Download and install the Sticker application.
2. **Creating a Sticker**: Click the system tray icon and select "New Sticker" or use the keyboard shortcut Ctrl+N.
3. **Editing a Sticker**: Click on a sticker to edit its content.
4. **Moving a Sticker**: Drag a sticker by its header to move it around the screen.
5. **Resizing a Sticker**: Drag the bottom-right corner of a sticker to resize it.
6. **Closing a Sticker**: Click the X button in the top-right corner of a sticker to close it.

### Using Speech-to-Text

1. **Recording Speech**: Click the microphone button in a sticker to start recording.
2. **Stopping Recording**: Click the microphone button again to stop recording and transcribe the speech.
3. **Keyboard Shortcut**: Use Ctrl+Shift+M to toggle recording.

For more details, see the [Speech-to-Text User Guide](speech-to-text-user-guide.md).

## Developer Guides

### Building from Source

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the application: `npm start`
4. Build the application: `npm run build`

### Running Tests

1. Run unit tests: `npm test`
2. Run integration tests: `npm run test:integration`

### Project Structure

```
sticker/
├── docs/                  # Documentation
├── services/              # Service modules
├── utils/                 # Utility modules
├── tests/                 # Tests
├── electron-main.js       # Main process entry point
├── sticker.html           # Sticker window HTML
├── sticker.js             # Sticker window JavaScript
├── package.json           # Project configuration
└── README.md              # Project README
```

### Adding New Features

1. **Plan**: Understand the existing architecture and how your feature fits in.
2. **Implement**: Add your feature following the existing patterns and best practices.
3. **Test**: Write tests for your feature to ensure it works correctly.
4. **Document**: Update the documentation to include your feature.

## Contributing

Contributions to the Sticker application are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for your changes
5. Submit a pull request

## License

The Sticker application is licensed under the MIT License. See the LICENSE file for details.
