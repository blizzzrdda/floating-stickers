/**
 * Unit tests for Speech-to-Text functionality
 */

import { jest } from '@jest/globals';

// Mock the OpenAI module
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn().mockResolvedValue({
            text: 'This is a mock transcription'
          })
        }
      }
    }))
  };
});

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock audio data')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined)
  },
  createReadStream: jest.fn().mockReturnValue('mock stream'),
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn().mockImplementation(() => {})
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  dirname: jest.fn().mockReturnValue('/mock/dir'),
  resolve: jest.fn().mockImplementation((...args) => args.join('/'))
}));

// Import the whisper service
import whisperService from '../../services/whisperService.js';

describe('Speech-to-Text Functionality', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('WhisperService', () => {
    test('should initialize correctly', () => {
      expect(whisperService).toBeDefined();
    });

    test('should prepare audio data from buffer', async () => {
      const audioBuffer = Buffer.from('mock audio data');
      const result = await whisperService.prepareAudioData(audioBuffer);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      // Verify fs.promises.writeFile was called
      const { promises } = require('fs');
      expect(promises.writeFile).toHaveBeenCalled();
    });

    test('should prepare audio data from file path', async () => {
      const filePath = '/path/to/audio.webm';
      const result = await whisperService.prepareAudioData(filePath);
      
      expect(result).toBe(filePath);
      
      // Verify fs.promises.writeFile was not called
      const { promises } = require('fs');
      expect(promises.writeFile).not.toHaveBeenCalled();
    });

    test('should transcribe audio file', async () => {
      const filePath = '/path/to/audio.webm';
      const result = await whisperService.transcribeFile(filePath);
      
      expect(result).toBe('This is a mock transcription');
      
      // Verify OpenAI API was called
      const { OpenAI } = require('openai');
      const mockOpenAIInstance = OpenAI.mock.results[0].value;
      expect(mockOpenAIInstance.audio.transcriptions.create).toHaveBeenCalled();
      
      // Verify the correct parameters were passed
      const createCall = mockOpenAIInstance.audio.transcriptions.create.mock.calls[0][0];
      expect(createCall.model).toBe('whisper-1');
      expect(createCall.file).toBe('mock stream');
    });

    test('should handle API errors gracefully', async () => {
      // Mock OpenAI API to throw an error
      const { OpenAI } = require('openai');
      const mockOpenAIInstance = OpenAI.mock.results[0].value;
      mockOpenAIInstance.audio.transcriptions.create.mockRejectedValueOnce(
        new Error('API error')
      );

      // Call transcribeFile and expect it to handle the error
      await expect(whisperService.transcribeFile('/path/to/audio.webm'))
        .rejects.toThrow();
    });

    test('should handle API timeout', async () => {
      // Mock OpenAI API to never resolve (simulating timeout)
      const { OpenAI } = require('openai');
      const mockOpenAIInstance = OpenAI.mock.results[0].value;
      mockOpenAIInstance.audio.transcriptions.create.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          // This promise never resolves, simulating a hanging request
          setTimeout(resolve, 100000);
        });
      });

      // Mock setTimeout to trigger immediately
      jest.useFakeTimers();
      
      // Start the transcription (it will timeout)
      const transcriptionPromise = whisperService.transcribeFile('/path/to/audio.webm');
      
      // Fast-forward timers
      jest.advanceTimersByTime(31000);
      
      // Expect the promise to reject with a timeout error
      await expect(transcriptionPromise).rejects.toThrow('API request timed out');
      
      // Restore timers
      jest.useRealTimers();
    });

    test('should clean up temporary files after transcription', async () => {
      const filePath = '/path/to/audio.webm';
      await whisperService.transcribeFile(filePath);
      
      // Verify fs.unlinkSync was called to clean up temp files
      const fs = require('fs');
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    test('should support different languages', async () => {
      const filePath = '/path/to/audio.webm';
      const options = { language: 'es' };
      await whisperService.transcribeFile(filePath, options);
      
      // Verify OpenAI API was called with the correct language
      const { OpenAI } = require('openai');
      const mockOpenAIInstance = OpenAI.mock.results[0].value;
      const createCall = mockOpenAIInstance.audio.transcriptions.create.mock.calls[0][0];
      expect(createCall.language).toBe('es');
    });
  });
});
