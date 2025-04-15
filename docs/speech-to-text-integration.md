# Speech-to-Text Integration

## Overview

The Sticker application integrates OpenAI's Whisper API to provide speech-to-text functionality, allowing users to dictate content directly into stickers. This document details the technical implementation of this feature, including architecture, data flow, error handling, and performance considerations.

## Architecture

The speech-to-text functionality is implemented using a multi-layered architecture:

1. **UI Layer**: Microphone button and recording indicators in the sticker UI
2. **Renderer Process Layer**: Audio recording and processing in the browser context
3. **Main Process Layer**: Audio file handling and API communication
4. **External Service Layer**: OpenAI Whisper API for transcription

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Renderer Process (Sticker Window)                               │
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │  Microphone     │     │  AudioRecorder  │                    │
│  │  Button         │────▶│  Class          │                    │
│  └─────────────────┘     └────────┬────────┘                    │
│                                   │                             │
│                                   ▼                             │
│                          ┌─────────────────┐                    │
│                          │  IPC Bridge     │                    │
│                          └────────┬────────┘                    │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Main Process                                                    │
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │  Audio          │     │  Whisper        │                    │
│  │  Recording      │────▶│  Service        │                    │
│  │  Service        │     │                 │                    │
│  └─────────────────┘     └────────┬────────┘                    │
│                                   │                             │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ External Service                                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  OpenAI Whisper API                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Microphone Button

A UI component in the sticker that allows users to start and stop recording.

**Location**: `sticker.html`

**Features**:
- Visual indicator for recording state
- Click handling for toggling recording
- Keyboard shortcut support (Ctrl+Shift+M)
- Status indicators (recording, processing, error)

**HTML Structure**:
```html
<button class="microphone-button" title="Record speech (Ctrl+Shift+M)" aria-label="Record speech">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
  </svg>
</button>
```

### 2. AudioRecorder Class

A JavaScript class that handles audio recording in the renderer process.

**Location**: `services/audioRecorder.js`

**Features**:
- Microphone access and permission handling
- Audio recording using MediaRecorder API
- Audio data collection and processing
- Communication with main process via IPC

**Key Methods**:
- `checkPermission()`: Check microphone permissions
- `startRecording()`: Begin audio recording
- `stopRecording()`: Stop recording and process audio
- `cancelRecording()`: Cancel recording and discard audio
- `getAvailableMicrophones()`: List available audio input devices

### 3. AudioRecordingService

A service in the main process that handles audio file operations.

**Location**: `services/audioRecordingService.js`

**Features**:
- Temporary file management
- Audio data saving and deletion
- Microphone permission handling
- Cleanup of old temporary files

**Key Methods**:
- `saveRecordedAudio()`: Save audio data to a temporary file
- `deleteTempAudio()`: Delete a temporary audio file
- `cleanupTempFiles()`: Remove old temporary files
- `checkMicrophonePermission()`: Check system microphone permissions
- `requestMicrophonePermission()`: Request microphone access

### 4. WhisperService

A service in the main process that communicates with the OpenAI Whisper API.

**Location**: `services/whisperService.js`

**Features**:
- OpenAI API client initialization
- Audio file preparation for API
- Transcription request handling
- Response processing
- Error handling and retries

**Key Methods**:
- `transcribe()`: High-level method to transcribe audio
- `prepareAudioData()`: Prepare audio data for the API
- `transcribeFile()`: Send a file to the Whisper API
- `processResponse()`: Process the API response

## Data Flow

### Recording and Transcription Flow

1. **Initiate Recording**:
   ```
   User clicks microphone button
   ↓
   AudioRecorder.startRecording() is called
   ↓
   Browser requests microphone permission
   ↓
   MediaRecorder starts capturing audio
   ↓
   Microphone button updates to show recording state
   ```

2. **Stop Recording**:
   ```
   User clicks microphone button again
   ↓
   AudioRecorder.stopRecording() is called
   ↓
   MediaRecorder stops capturing audio
   ↓
   Audio data is collected and processed
   ↓
   Microphone button updates to show processing state
   ```

3. **Save Audio**:
   ```
   AudioRecorder sends audio data to main process
   ↓
   AudioRecordingService.saveRecordedAudio() is called
   ↓
   Audio data is saved to a temporary file
   ↓
   File path is returned to renderer process
   ```

4. **Transcribe Audio**:
   ```
   Renderer process requests transcription
   ↓
   WhisperService.transcribe() is called
   ↓
   Audio file is prepared for the API
   ↓
   Request is sent to OpenAI Whisper API
   ↓
   API processes audio and returns transcription
   ↓
   WhisperService processes the response
   ↓
   Transcription text is returned to renderer process
   ```

5. **Update Sticker**:
   ```
   Renderer process receives transcription
   ↓
   Sticker content is updated with transcribed text
   ↓
   Microphone button returns to normal state
   ↓
   Sticker content is saved
   ```

6. **Cleanup**:
   ```
   Temporary audio file is deleted
   ↓
   AudioRecorder releases microphone
   ```

### IPC Communication

The application uses Electron's IPC (Inter-Process Communication) for communication between renderer and main processes:

#### Renderer to Main
- `save-recorded-audio`: Send recorded audio data to main process
- `transcribe-audio`: Request transcription of audio file
- `delete-temp-audio`: Request deletion of temporary audio file
- `check-microphone-permission`: Check microphone permissions
- `request-microphone-permission`: Request microphone permissions

#### Main to Renderer
- Responses to the above requests

## Implementation Details

### Audio Recording

The application uses the browser's MediaRecorder API to capture audio:

```javascript
/**
 * Start recording audio
 * @returns {Promise<boolean>} - Success status
 */
async startRecording() {
  try {
    // Check if already recording
    if (this.isRecording) {
      return true;
    }
    
    // Request microphone access
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.stream);
    
    // Set up data handling
    this.audioChunks = [];
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    // Set up stop handling
    this.mediaRecorder.onstop = async () => {
      // Process audio data when recording stops
      await this.processAudioData();
    };
    
    // Start recording
    this.mediaRecorder.start();
    this.isRecording = true;
    
    // Notify status change
    if (this.onStatusChange) {
      this.onStatusChange('recording', { stream: this.stream });
    }
    
    return true;
  } catch (error) {
    console.error('Error starting recording:', error);
    
    // Notify error
    if (this.onError) {
      this.onError(error);
    }
    
    // Notify status change
    if (this.onStatusChange) {
      this.onStatusChange('error', { error });
    }
    
    return false;
  }
}
```

### Audio Processing

After recording, the audio data is processed and sent to the main process:

```javascript
/**
 * Process recorded audio data
 * @returns {Promise<void>}
 */
async processAudioData() {
  try {
    // Notify status change
    if (this.onStatusChange) {
      this.onStatusChange('processing');
    }
    
    // Create blob from audio chunks
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    
    // Convert blob to base64
    const base64Data = await this.blobToBase64(audioBlob);
    
    // Send to main process
    const result = await window.stickerAPI.saveRecordedAudio({
      data: base64Data.split(',')[1], // Remove data URL prefix
      type: audioBlob.type,
      size: audioBlob.size
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save audio');
    }
    
    // Request transcription
    const transcription = await window.stickerAPI.transcribeAudio(result.filePath);
    
    // Clean up temporary file
    await window.stickerAPI.deleteTempAudio(result.filePath);
    
    // Handle transcription result
    if (transcription.success) {
      // Notify completion
      if (this.onRecordingComplete) {
        this.onRecordingComplete(transcription.text);
      }
      
      // Notify status change
      if (this.onStatusChange) {
        this.onStatusChange('completed');
      }
    } else {
      throw new Error(transcription.error || 'Transcription failed');
    }
  } catch (error) {
    console.error('Error processing audio:', error);
    
    // Notify error
    if (this.onError) {
      this.onError(error);
    }
    
    // Notify status change
    if (this.onStatusChange) {
      this.onStatusChange('error', { error });
    }
  } finally {
    // Reset state
    this.isRecording = false;
    this.audioChunks = [];
    
    // Release microphone
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
```

### Whisper API Integration

The WhisperService communicates with the OpenAI Whisper API:

```javascript
/**
 * Transcribe an audio file using the Whisper API
 * @param {string} filePath - Path to the audio file
 * @param {Object} options - Transcription options
 * @returns {Promise<string>} - Transcribed text
 */
async transcribeFile(filePath, options = {}) {
  try {
    // Create a read stream for the file
    const file = fs.createReadStream(filePath);
    
    // Set up API request
    const requestOptions = {
      model: 'whisper-1',
      file,
      language: options.language || 'en',
      response_format: 'json'
    };
    
    // Set up timeout handling
    const timeoutMs = options.timeoutMs || 30000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API request timed out')), timeoutMs);
    });
    
    // Make API request with timeout
    const responsePromise = this.openai.audio.transcriptions.create(requestOptions);
    const response = await Promise.race([responsePromise, timeoutPromise]);
    
    // Process response
    return response.text;
  } catch (error) {
    console.error('Error transcribing file:', error);
    throw error;
  } finally {
    // Clean up temporary file if needed
    if (options.cleanupFile) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error('Error deleting temporary file:', error);
      }
    }
  }
}
```

## Error Handling

The speech-to-text integration includes comprehensive error handling:

### Permission Errors

```javascript
/**
 * Check microphone permission
 * @returns {Promise<boolean>} - Permission status
 */
async checkPermission() {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Release microphone immediately
    stream.getTracks().forEach(track => track.stop());
    
    // Notify status change
    if (this.onStatusChange) {
      this.onStatusChange('permission_granted');
    }
    
    return true;
  } catch (error) {
    console.error('Microphone permission error:', error);
    
    // Determine error type
    const errorType = error.name === 'NotAllowedError' ? 'permission_denied' : 'permission_error';
    
    // Notify status change
    if (this.onStatusChange) {
      this.onStatusChange(errorType);
    }
    
    // Notify error
    if (this.onError) {
      this.onError(error);
    }
    
    return false;
  }
}
```

### API Errors

```javascript
/**
 * Handle API errors
 * @param {Error} error - The error object
 * @returns {Object} - Categorized error
 */
handleApiError(error) {
  // Default error response
  const errorResponse = {
    success: false,
    error: 'Transcription failed',
    details: error.message
  };
  
  // Check for timeout
  if (error.message.includes('timed out')) {
    errorResponse.error = 'Transcription timed out';
    errorResponse.code = 'TIMEOUT';
    return errorResponse;
  }
  
  // Check for network errors
  if (error.message.includes('network') || error.code === 'ENOTFOUND') {
    errorResponse.error = 'Network error';
    errorResponse.code = 'NETWORK';
    return errorResponse;
  }
  
  // Check for API-specific errors
  if (error.status) {
    switch (error.status) {
      case 401:
        errorResponse.error = 'Authentication error';
        errorResponse.code = 'AUTH';
        break;
      case 429:
        errorResponse.error = 'Rate limit exceeded';
        errorResponse.code = 'RATE_LIMIT';
        break;
      case 400:
        errorResponse.error = 'Invalid request';
        errorResponse.code = 'BAD_REQUEST';
        break;
      case 500:
        errorResponse.error = 'Server error';
        errorResponse.code = 'SERVER';
        break;
      default:
        errorResponse.code = 'API';
    }
  }
  
  return errorResponse;
}
```

### File System Errors

```javascript
/**
 * Delete a temporary audio file
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} - Result
 */
async deleteTempAudio(filePath) {
  try {
    // Validate file path
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'Invalid file path' };
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return { success: true, message: 'File does not exist' };
    }
    
    // Delete file
    fs.unlinkSync(filePath);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting temporary audio file:', error);
    return { success: false, error: error.message };
  }
}
```

## Performance Considerations

### Audio Format Optimization

The application uses the WebM format for audio recording, which provides good compression while maintaining quality:

```javascript
// Configure MediaRecorder with optimal settings
const options = {
  mimeType: 'audio/webm',
  audioBitsPerSecond: 128000
};

this.mediaRecorder = new MediaRecorder(this.stream, options);
```

### Timeout Handling

The application implements timeout handling for API requests:

```javascript
// Set up timeout handling
const timeoutMs = options.timeoutMs || 30000;
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('API request timed out')), timeoutMs);
});

// Make API request with timeout
const responsePromise = this.openai.audio.transcriptions.create(requestOptions);
const response = await Promise.race([responsePromise, timeoutPromise]);
```

### Resource Cleanup

The application ensures proper cleanup of resources:

```javascript
// Release microphone
if (this.stream) {
  this.stream.getTracks().forEach(track => track.stop());
}

// Clean up temporary file
if (options.cleanupFile) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Error deleting temporary file:', error);
  }
}
```

## User Experience Considerations

### Visual Feedback

The application provides visual feedback during the speech-to-text process:

```javascript
// Update microphone button appearance based on state
function updateMicrophoneButtonState(state) {
  const button = document.querySelector('.microphone-button');
  
  // Remove all state classes
  button.classList.remove('recording', 'processing', 'error');
  
  // Add appropriate class based on state
  if (state) {
    button.classList.add(state);
  }
}
```

### Error Messages

The application displays user-friendly error messages:

```javascript
// Display error message to user
function showErrorMessage(error) {
  let message = 'An error occurred while processing your speech.';
  
  // Customize message based on error type
  if (error.code === 'PERMISSION') {
    message = 'Microphone access is required for speech-to-text.';
  } else if (error.code === 'NETWORK') {
    message = 'Network error. Please check your internet connection.';
  } else if (error.code === 'TIMEOUT') {
    message = 'The transcription request timed out. Please try again.';
  }
  
  // Show message to user
  alert(message);
}
```

### Keyboard Shortcuts

The application supports keyboard shortcuts for accessibility:

```javascript
// Register keyboard shortcut for microphone
document.addEventListener('keydown', event => {
  // Check for Ctrl+Shift+M
  if (event.ctrlKey && event.shiftKey && event.key === 'M') {
    event.preventDefault();
    toggleRecording();
  }
});
```

## Configuration Options

The speech-to-text functionality supports several configuration options:

### Language Selection

```javascript
// Get language preference from user settings
const preferences = preferencesService.getPreferences();
const language = preferences.language || 'en';

// Pass language to Whisper API
const requestOptions = {
  model: 'whisper-1',
  file,
  language,
  response_format: 'json'
};
```

### Text Append Mode

```javascript
// Check if text should be appended or replaced
const preferences = preferencesService.getPreferences();
const shouldAppend = preferences.textAppendMode || false;

// Update sticker content
if (shouldAppend && content.textContent.trim() !== '') {
  // Append text with space
  content.textContent = content.textContent.trim() + ' ' + transcription.trim();
} else {
  // Replace text
  content.textContent = transcription.trim();
}
```

## Testing

The speech-to-text functionality includes comprehensive tests:

### Unit Tests

```javascript
// Test transcription with mock API
test('should transcribe audio file', async () => {
  // Mock OpenAI API response
  const mockOpenAI = {
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({
          text: 'This is a mock transcription'
        })
      }
    }
  };
  
  // Create service with mock
  const service = new WhisperService(mockOpenAI);
  
  // Test transcription
  const result = await service.transcribeFile('/path/to/audio.webm');
  
  // Verify result
  expect(result).toBe('This is a mock transcription');
  
  // Verify API was called correctly
  expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      model: 'whisper-1',
      language: 'en'
    })
  );
});
```

### Integration Tests

```javascript
// Test end-to-end recording and transcription
test('should record and transcribe speech', async () => {
  // Mock browser APIs
  global.MediaRecorder = jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    ondataavailable: null,
    onstop: null
  }));
  
  // Mock IPC
  window.stickerAPI = {
    saveRecordedAudio: jest.fn().mockResolvedValue({
      success: true,
      filePath: '/mock/path/audio.webm'
    }),
    transcribeAudio: jest.fn().mockResolvedValue({
      success: true,
      text: 'This is a mock transcription'
    }),
    deleteTempAudio: jest.fn().mockResolvedValue({
      success: true
    })
  };
  
  // Create recorder
  const recorder = new AudioRecorder({
    onStatusChange: jest.fn(),
    onError: jest.fn(),
    onRecordingComplete: jest.fn()
  });
  
  // Start recording
  await recorder.startRecording();
  
  // Simulate audio data
  recorder.audioChunks = [new Blob(['mock audio data'])];
  
  // Stop recording
  await recorder.stopRecording();
  
  // Trigger onstop event
  recorder.mediaRecorder.onstop();
  
  // Wait for async operations
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // Verify IPC calls
  expect(window.stickerAPI.saveRecordedAudio).toHaveBeenCalled();
  expect(window.stickerAPI.transcribeAudio).toHaveBeenCalled();
  expect(window.stickerAPI.deleteTempAudio).toHaveBeenCalled();
  
  // Verify callbacks
  expect(recorder.onRecordingComplete).toHaveBeenCalledWith('This is a mock transcription');
  expect(recorder.onStatusChange).toHaveBeenCalledWith('completed');
});
```

## Security Considerations

### API Key Protection

The application securely stores and manages the OpenAI API key:

```javascript
// Initialize OpenAI client with API key
constructor() {
  // Get API key from environment or secure storage
  const apiKey = process.env.OPENAI_API_KEY || getSecureApiKey();
  
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  // Create OpenAI client
  this.openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: false // Ensure API key is not exposed to browser
  });
}
```

### Temporary File Handling

The application securely manages temporary audio files:

```javascript
// Generate secure random filename
const randomBytes = crypto.randomBytes(16);
const filename = `recording-${randomBytes.toString('hex')}.webm`;
const filePath = path.join(tempDir, filename);

// Set appropriate file permissions
fs.writeFileSync(filePath, buffer, { mode: 0o600 }); // Read/write for owner only
```

## Conclusion

The speech-to-text integration in the Sticker application provides a seamless and robust way for users to dictate content directly into stickers. By leveraging OpenAI's Whisper API and implementing a comprehensive architecture with proper error handling and performance optimizations, the application delivers a high-quality speech-to-text experience.
