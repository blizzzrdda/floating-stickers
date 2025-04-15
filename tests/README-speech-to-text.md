# Speech-to-Text Tests

This directory contains tests for the speech-to-text functionality in the Sticker application.

## Test Structure

The tests are organized into the following categories:

### Unit Tests

- `speech-to-text.test.js`: Tests for the WhisperService that handles communication with the OpenAI Whisper API.
- `audioRecordingService.test.js`: Tests for the AudioRecordingService that handles audio file operations in the main process.
- `audioRecorder.test.js`: Tests for the AudioRecorder class that handles recording in the renderer process.
- `microphoneButton.test.js`: Tests for the microphone button UI component.
- `speech-to-text-error-handling.test.js`: Tests for error handling in the speech-to-text functionality.

### Integration Tests

- `speech-to-text.spec.js`: End-to-end tests for the speech-to-text functionality.

## Test Fixtures

- `fixtures/mock-audio.webm`: A mock audio file used for testing.

## Running the Tests

To run the unit tests:

```bash
npm test
```

To run the integration tests:

```bash
npm run test:integration
```

## Test Coverage

The tests cover the following aspects of the speech-to-text functionality:

1. **Audio Recording**:
   - Microphone permission handling
   - Recording start/stop
   - Audio data processing
   - Temporary file management

2. **Transcription**:
   - API communication with OpenAI Whisper
   - Language selection
   - Error handling
   - Response processing

3. **UI Integration**:
   - Microphone button functionality
   - Recording status indicators
   - Text insertion into stickers
   - Keyboard shortcuts

4. **Error Handling**:
   - Network errors
   - API errors
   - Authentication errors
   - Rate limiting
   - File system errors
   - Timeout handling

## Mocking Strategy

The tests use the following mocking strategies:

1. **API Mocking**: The OpenAI API is mocked to return predefined responses or errors.
2. **Browser API Mocking**: Browser APIs like MediaRecorder and getUserMedia are mocked.
3. **File System Mocking**: File system operations are mocked to avoid actual file I/O.
4. **IPC Mocking**: Electron IPC communication is mocked to simulate main/renderer process interaction.

## Test Data

The tests use the following test data:

1. **Mock Audio**: A simple mock audio file for testing transcription.
2. **Test Phrases**: Standard phrases for testing transcription accuracy.
3. **Error Scenarios**: Various error conditions to test error handling.

## Adding New Tests

When adding new tests for the speech-to-text functionality, consider the following:

1. **Isolation**: Ensure tests are isolated and don't depend on external services.
2. **Mocking**: Use appropriate mocks for external dependencies.
3. **Coverage**: Aim to cover both happy paths and error scenarios.
4. **Performance**: Keep tests efficient to avoid long test runs.

## Known Limitations

1. **Real API Testing**: The tests don't test against the actual OpenAI API to avoid API costs.
2. **Audio Quality Testing**: The tests don't verify transcription accuracy with real audio.
3. **Browser Compatibility**: The tests don't verify compatibility across different browsers.
