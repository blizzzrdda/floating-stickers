/**
 * Tests for the Whisper Service (Speech-to-Text)
 */

import { jest } from '@jest/globals';

// Mock OpenAI module
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
    writeFile: jest.fn().mockResolvedValue(undefined)
  },
  createReadStream: jest.fn().mockReturnValue('mock stream')
}));

// Import the whisper service
import whisperService from '../../services/whisperService.js';

describe('WhisperService', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  test('WhisperService is defined', () => {
    expect(whisperService).toBeDefined();
  });

  test('WhisperService has required methods', () => {
    expect(typeof whisperService.transcribeFile).toBe('function');
    expect(typeof whisperService.prepareAudioData).toBe('function');
  });

  test('prepareAudioData processes audio data correctly', async () => {
    // Mock audio data
    const audioData = Buffer.from('mock audio data');

    // Call prepareAudioData
    const result = await whisperService.prepareAudioData(audioData);

    // Verify result is a string (file path)
    expect(typeof result).toBe('string');

    // Verify fs.promises.writeFile was called
    const { promises } = require('fs');
    expect(promises.writeFile).toHaveBeenCalled();

    // Verify the file path contains the expected extension
    expect(result.endsWith('.webm')).toBe(true);
  });

  test('transcribeFile calls OpenAI API correctly', async () => {
    // Mock file path
    const filePath = 'test-audio.webm';

    // Call transcribeFile
    const result = await whisperService.transcribeFile(filePath);

    // Verify result
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

  test('transcribeFile handles errors gracefully', async () => {
    // Mock OpenAI API to throw an error
    const { OpenAI } = require('openai');
    const mockOpenAIInstance = OpenAI.mock.results[0].value;
    mockOpenAIInstance.audio.transcriptions.create.mockRejectedValueOnce(
      new Error('API error')
    );

    // Call transcribeFile
    const result = await whisperService.transcribeFile('test-audio.webm');

    // Verify result is an empty string (error fallback)
    expect(result).toBe('');
  });

  test('prepareAudioData handles errors gracefully', async () => {
    // Mock fs.promises.writeFile to throw an error
    const { promises } = require('fs');
    promises.writeFile.mockRejectedValueOnce(new Error('Write error'));

    // Call prepareAudioData
    const result = await whisperService.prepareAudioData(Buffer.from('mock audio data'));

    // Verify result is null (error fallback)
    expect(result).toBeNull();
  });
});
