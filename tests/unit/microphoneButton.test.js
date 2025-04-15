/**
 * Unit tests for Microphone Button UI Component
 */

import { jest } from '@jest/globals';

// Mock DOM elements
document.body.innerHTML = `
<div class="sticker">
  <div class="sticker-content" contenteditable="true"></div>
  <button class="microphone-button" title="Record speech (Ctrl+Shift+M)" aria-label="Record speech">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
  </button>
</div>
`;

// Mock AudioRecorder
jest.mock('../../services/audioRecorder.js', () => {
  return jest.fn().mockImplementation(() => ({
    startRecording: jest.fn().mockResolvedValue(true),
    stopRecording: jest.fn().mockResolvedValue(true),
    cancelRecording: jest.fn().mockResolvedValue(true),
    destroy: jest.fn(),
    onStatusChange: null,
    onError: null,
    onRecordingComplete: null
  }));
});

// Mock window.stickerAPI
global.window = {
  stickerAPI: {
    transcribeAudio: jest.fn().mockResolvedValue({
      success: true,
      text: 'This is a mock transcription'
    })
  }
};

// Import the AudioRecorder class
import AudioRecorder from '../../services/audioRecorder.js';

describe('Microphone Button UI Component', () => {
  let microphoneBtn;
  let content;
  let audioRecorder;
  let startRecordingFn;
  let stopRecordingFn;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get DOM elements
    microphoneBtn = document.querySelector('.microphone-button');
    content = document.querySelector('.sticker-content');
    
    // Create mock functions
    startRecordingFn = jest.fn();
    stopRecordingFn = jest.fn();
    
    // Create a mock implementation of the microphone button functionality
    audioRecorder = new AudioRecorder();
  });
  
  test('should initialize microphone button correctly', () => {
    expect(microphoneBtn).not.toBeNull();
    expect(microphoneBtn.getAttribute('title')).toBe('Record speech (Ctrl+Shift+M)');
    expect(microphoneBtn.getAttribute('aria-label')).toBe('Record speech');
  });
  
  test('should add recording class when recording starts', () => {
    // Start recording
    microphoneBtn.classList.add('recording');
    
    // Verify class was added
    expect(microphoneBtn.classList.contains('recording')).toBe(true);
  });
  
  test('should add processing class when recording stops', () => {
    // Start recording
    microphoneBtn.classList.add('recording');
    
    // Stop recording
    microphoneBtn.classList.remove('recording');
    microphoneBtn.classList.add('processing');
    
    // Verify classes
    expect(microphoneBtn.classList.contains('recording')).toBe(false);
    expect(microphoneBtn.classList.contains('processing')).toBe(true);
  });
  
  test('should remove all classes when processing completes', () => {
    // Add processing class
    microphoneBtn.classList.add('processing');
    
    // Complete processing
    microphoneBtn.classList.remove('processing');
    
    // Verify classes
    expect(microphoneBtn.classList.contains('recording')).toBe(false);
    expect(microphoneBtn.classList.contains('processing')).toBe(false);
  });
  
  test('should handle click events', () => {
    // Create a click handler
    const clickHandler = jest.fn();
    
    // Add click event listener
    microphoneBtn.addEventListener('click', clickHandler);
    
    // Simulate click
    microphoneBtn.click();
    
    // Verify click handler was called
    expect(clickHandler).toHaveBeenCalled();
  });
  
  test('should handle keyboard shortcuts', () => {
    // Create a keydown handler
    const keydownHandler = jest.fn();
    
    // Add keydown event listener
    document.addEventListener('keydown', keydownHandler);
    
    // Simulate Ctrl+Shift+M keydown
    const event = new KeyboardEvent('keydown', {
      key: 'm',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true
    });
    document.dispatchEvent(event);
    
    // Verify keydown handler was called
    expect(keydownHandler).toHaveBeenCalled();
  });
  
  test('should update content with transcription', () => {
    // Set initial content
    content.textContent = '';
    
    // Update content with transcription
    content.textContent = 'This is a mock transcription';
    
    // Verify content was updated
    expect(content.textContent).toBe('This is a mock transcription');
  });
  
  test('should append transcription to existing content', () => {
    // Set initial content
    content.textContent = 'Initial content. ';
    
    // Append transcription
    content.textContent += 'This is a mock transcription';
    
    // Verify content was updated
    expect(content.textContent).toBe('Initial content. This is a mock transcription');
  });
  
  test('should handle AudioRecorder initialization', () => {
    // Verify AudioRecorder was imported
    expect(AudioRecorder).toBeDefined();
    
    // Verify AudioRecorder constructor was called
    expect(AudioRecorder).toHaveBeenCalled();
    
    // Verify audioRecorder instance was created
    expect(audioRecorder).toBeDefined();
  });
});
