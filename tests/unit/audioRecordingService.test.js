/**
 * Unit tests for Audio Recording Service
 */

import { jest } from '@jest/globals';

// Mock electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn()
  },
  app: {
    getPath: jest.fn().mockReturnValue('/mock/temp')
  }
}));

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue(['file1.webm', 'file2.webm']),
  statSync: jest.fn().mockReturnValue({
    mtime: new Date(Date.now() - 1000 * 60 * 60), // 1 hour old
    isFile: () => true
  })
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  dirname: jest.fn().mockReturnValue('/mock/dir'),
  resolve: jest.fn().mockImplementation((...args) => args.join('/'))
}));

// Import the audio recording service
import AudioRecordingService from '../../services/audioRecordingService.js';

describe('Audio Recording Service', () => {
  let audioRecordingService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance for each test
    audioRecordingService = new AudioRecordingService();
  });

  test('should initialize correctly', () => {
    expect(audioRecordingService).toBeDefined();
    
    // Verify temp directory is created if it doesn't exist
    const fs = require('fs');
    const { app } = require('electron');
    
    expect(app.getPath).toHaveBeenCalledWith('temp');
    expect(fs.existsSync).toHaveBeenCalled();
  });

  test('should register IPC handlers', () => {
    // Verify IPC handlers are registered
    const { ipcMain } = require('electron');
    
    expect(ipcMain.handle).toHaveBeenCalledTimes(4);
    expect(ipcMain.handle).toHaveBeenCalledWith('check-microphone-permission', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('request-microphone-permission', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('save-recorded-audio', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('delete-temp-audio', expect.any(Function));
  });

  test('should save recorded audio', async () => {
    // Mock audio data
    const audioData = {
      data: 'base64encodedaudiodata',
      type: 'audio/webm',
      size: 1024
    };
    
    // Call saveRecordedAudio
    const result = await audioRecordingService.saveRecordedAudio(audioData);
    
    // Verify result
    expect(result.success).toBe(true);
    expect(result.filePath).toBeDefined();
    
    // Verify fs.writeFileSync was called
    const fs = require('fs');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('should handle errors when saving audio', async () => {
    // Mock fs.writeFileSync to throw an error
    const fs = require('fs');
    fs.writeFileSync.mockImplementationOnce(() => {
      throw new Error('Write error');
    });
    
    // Mock audio data
    const audioData = {
      data: 'base64encodedaudiodata',
      type: 'audio/webm',
      size: 1024
    };
    
    // Call saveRecordedAudio
    const result = await audioRecordingService.saveRecordedAudio(audioData);
    
    // Verify result
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should delete temporary audio file', async () => {
    // Call deleteTempAudio
    const result = await audioRecordingService.deleteTempAudio('/mock/temp/recording.webm');
    
    // Verify result
    expect(result.success).toBe(true);
    
    // Verify fs.unlinkSync was called
    const fs = require('fs');
    expect(fs.unlinkSync).toHaveBeenCalledWith('/mock/temp/recording.webm');
  });

  test('should handle errors when deleting audio', async () => {
    // Mock fs.unlinkSync to throw an error
    const fs = require('fs');
    fs.unlinkSync.mockImplementationOnce(() => {
      throw new Error('Delete error');
    });
    
    // Call deleteTempAudio
    const result = await audioRecordingService.deleteTempAudio('/mock/temp/recording.webm');
    
    // Verify result
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should clean up old temporary files', async () => {
    // Call cleanupTempFiles
    await audioRecordingService.cleanupTempFiles();
    
    // Verify fs.readdirSync and fs.unlinkSync were called
    const fs = require('fs');
    expect(fs.readdirSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  test('should check microphone permission', async () => {
    // Call checkMicrophonePermission
    const result = await audioRecordingService.checkMicrophonePermission();
    
    // Verify result (this is a stub in Electron main process)
    expect(result.success).toBe(true);
  });

  test('should request microphone permission', async () => {
    // Call requestMicrophonePermission
    const result = await audioRecordingService.requestMicrophonePermission();
    
    // Verify result (this is a stub in Electron main process)
    expect(result.success).toBe(true);
  });
});
