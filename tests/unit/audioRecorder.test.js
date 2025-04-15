/**
 * Unit tests for Audio Recorder
 */

import { jest } from '@jest/globals';

// Mock MediaRecorder and related browser APIs
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive'
}));

global.navigator = {
  mediaDevices: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([
        { stop: jest.fn() }
      ])
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      { kind: 'audioinput', deviceId: 'default', label: 'Default Microphone' },
      { kind: 'audioinput', deviceId: 'device1', label: 'Microphone 1' }
    ])
  }
};

global.Blob = jest.fn().mockImplementation((chunks, options) => ({
  size: chunks.reduce((acc, chunk) => acc + (chunk.size || 0), 0) || 1024,
  type: options.type || 'audio/webm'
}));

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(function() {
    setTimeout(() => {
      this.onload({ target: { result: 'data:audio/webm;base64,mockbase64data' } });
    }, 0);
  }),
  onload: null
}));

// Mock window.stickerAPI
global.window = {
  stickerAPI: {
    saveRecordedAudio: jest.fn().mockResolvedValue({
      success: true,
      filePath: '/mock/temp/recording.webm'
    }),
    transcribeAudio: jest.fn().mockResolvedValue({
      success: true,
      text: 'This is a mock transcription'
    }),
    deleteTempAudio: jest.fn().mockResolvedValue({
      success: true
    })
  }
};

// Import the audio recorder
import AudioRecorder from '../../services/audioRecorder.js';

describe('Audio Recorder', () => {
  let audioRecorder;
  let mockStatusCallback;
  let mockErrorCallback;
  let mockCompleteCallback;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mock callbacks
    mockStatusCallback = jest.fn();
    mockErrorCallback = jest.fn();
    mockCompleteCallback = jest.fn();
    
    // Create a new instance for each test
    audioRecorder = new AudioRecorder({
      onStatusChange: mockStatusCallback,
      onError: mockErrorCallback,
      onRecordingComplete: mockCompleteCallback
    });
  });

  test('should initialize correctly', () => {
    expect(audioRecorder).toBeDefined();
    expect(audioRecorder.isRecording).toBe(false);
    expect(audioRecorder.audioChunks).toEqual([]);
  });

  test('should check microphone permission', async () => {
    const result = await audioRecorder.checkPermission();
    
    expect(result).toBe(true);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(mockStatusCallback).toHaveBeenCalledWith('permission_granted');
  });

  test('should handle permission denial', async () => {
    // Mock getUserMedia to reject
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
      new Error('Permission denied')
    );
    
    const result = await audioRecorder.checkPermission();
    
    expect(result).toBe(false);
    expect(mockStatusCallback).toHaveBeenCalledWith('permission_denied');
    expect(mockErrorCallback).toHaveBeenCalled();
  });

  test('should start recording', async () => {
    await audioRecorder.startRecording();
    
    expect(audioRecorder.isRecording).toBe(true);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(global.MediaRecorder).toHaveBeenCalled();
    expect(audioRecorder.mediaRecorder.start).toHaveBeenCalled();
    expect(mockStatusCallback).toHaveBeenCalledWith('recording', expect.any(Object));
  });

  test('should stop recording and process audio', async () => {
    // Start recording first
    await audioRecorder.startRecording();
    
    // Mock audio chunks
    audioRecorder.audioChunks = [
      { size: 1024, type: 'audio/webm' }
    ];
    
    // Trigger ondataavailable event
    audioRecorder.mediaRecorder.ondataavailable({
      data: { size: 1024, type: 'audio/webm' }
    });
    
    // Stop recording
    await audioRecorder.stopRecording();
    
    // Trigger onstop event
    audioRecorder.mediaRecorder.onstop();
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(audioRecorder.isRecording).toBe(false);
    expect(window.stickerAPI.saveRecordedAudio).toHaveBeenCalled();
    expect(mockStatusCallback).toHaveBeenCalledWith('processing');
    expect(mockCompleteCallback).toHaveBeenCalled();
  });

  test('should handle errors when saving audio', async () => {
    // Mock saveRecordedAudio to fail
    window.stickerAPI.saveRecordedAudio.mockResolvedValueOnce({
      success: false,
      error: 'Save error'
    });
    
    // Start recording
    await audioRecorder.startRecording();
    
    // Mock audio chunks
    audioRecorder.audioChunks = [
      { size: 1024, type: 'audio/webm' }
    ];
    
    // Stop recording
    await audioRecorder.stopRecording();
    
    // Trigger onstop event
    audioRecorder.mediaRecorder.onstop();
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockStatusCallback).toHaveBeenCalledWith('error', expect.any(Object));
    expect(mockErrorCallback).toHaveBeenCalled();
  });

  test('should get available microphones', async () => {
    const devices = await audioRecorder.getAvailableMicrophones();
    
    expect(devices.length).toBe(2);
    expect(devices[0].deviceId).toBe('default');
    expect(devices[1].deviceId).toBe('device1');
    expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled();
  });

  test('should handle errors when getting microphones', async () => {
    // Mock enumerateDevices to reject
    navigator.mediaDevices.enumerateDevices.mockRejectedValueOnce(
      new Error('Enumeration error')
    );
    
    const devices = await audioRecorder.getAvailableMicrophones();
    
    expect(devices).toEqual([]);
    expect(mockErrorCallback).toHaveBeenCalled();
  });

  test('should cancel recording', async () => {
    // Start recording
    await audioRecorder.startRecording();
    
    // Cancel recording
    await audioRecorder.cancelRecording();
    
    expect(audioRecorder.isRecording).toBe(false);
    expect(audioRecorder.audioChunks).toEqual([]);
    expect(mockStatusCallback).toHaveBeenCalledWith('cancelled');
  });

  test('should clean up resources when destroyed', async () => {
    // Start recording
    await audioRecorder.startRecording();
    
    // Destroy
    audioRecorder.destroy();
    
    expect(audioRecorder.isRecording).toBe(false);
    expect(audioRecorder.stream).toBeNull();
    expect(audioRecorder.mediaRecorder).toBeNull();
  });
});
