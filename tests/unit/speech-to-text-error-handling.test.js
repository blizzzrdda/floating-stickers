/**
 * Unit tests for Speech-to-Text Error Handling
 */

import { jest } from '@jest/globals';

// Mock OpenAI module with error scenarios
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn().mockImplementation(async () => {
            // Simulate different error scenarios based on the file path
            const args = OpenAI.mock.results[0].value.audio.transcriptions.create.mock.calls[0][0];
            const filePath = args.file.path || 'unknown';
            
            if (filePath.includes('network-error')) {
              throw new Error('Network error');
            } else if (filePath.includes('timeout')) {
              // This promise never resolves, simulating a timeout
              return new Promise(() => {});
            } else if (filePath.includes('api-error')) {
              throw {
                status: 400,
                error: {
                  message: 'API error: Invalid request',
                  type: 'invalid_request_error'
                }
              };
            } else if (filePath.includes('auth-error')) {
              throw {
                status: 401,
                error: {
                  message: 'Authentication error: Invalid API key',
                  type: 'authentication_error'
                }
              };
            } else if (filePath.includes('rate-limit')) {
              throw {
                status: 429,
                error: {
                  message: 'Rate limit exceeded',
                  type: 'rate_limit_error'
                }
              };
            } else if (filePath.includes('server-error')) {
              throw {
                status: 500,
                error: {
                  message: 'Server error',
                  type: 'server_error'
                }
              };
            } else if (filePath.includes('empty-audio')) {
              return { text: '' };
            } else {
              return { text: 'This is a mock transcription' };
            }
          })
        }
      }
    }))
  };
});

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockImplementation(async (path) => {
      if (path.includes('not-found')) {
        throw new Error('File not found');
      } else if (path.includes('permission-denied')) {
        throw new Error('Permission denied');
      } else {
        return Buffer.from('mock audio data');
      }
    }),
    writeFile: jest.fn().mockImplementation(async (path, data) => {
      if (path.includes('permission-denied')) {
        throw new Error('Permission denied');
      }
    }),
    unlink: jest.fn()
  },
  createReadStream: jest.fn().mockImplementation((path) => {
    return { path };
  }),
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn()
}));

// Import the whisper service
import whisperService from '../../services/whisperService.js';

describe('Speech-to-Text Error Handling', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset timeout mocks
    jest.useRealTimers();
  });

  test('should handle network errors gracefully', async () => {
    await expect(whisperService.transcribeFile('/path/to/network-error.webm'))
      .rejects.toThrow('Network error');
  });

  test('should handle API timeout', async () => {
    // Mock setTimeout to trigger immediately
    jest.useFakeTimers();
    
    // Start the transcription (it will timeout)
    const transcriptionPromise = whisperService.transcribeFile('/path/to/timeout.webm');
    
    // Fast-forward timers
    jest.advanceTimersByTime(31000);
    
    // Expect the promise to reject with a timeout error
    await expect(transcriptionPromise).rejects.toThrow('API request timed out');
  });

  test('should handle API errors with appropriate messages', async () => {
    await expect(whisperService.transcribeFile('/path/to/api-error.webm'))
      .rejects.toThrow('API error: Invalid request');
  });

  test('should handle authentication errors', async () => {
    await expect(whisperService.transcribeFile('/path/to/auth-error.webm'))
      .rejects.toThrow('Authentication error: Invalid API key');
  });

  test('should handle rate limit errors', async () => {
    await expect(whisperService.transcribeFile('/path/to/rate-limit.webm'))
      .rejects.toThrow('Rate limit exceeded');
  });

  test('should handle server errors', async () => {
    await expect(whisperService.transcribeFile('/path/to/server-error.webm'))
      .rejects.toThrow('Server error');
  });

  test('should handle file not found errors', async () => {
    await expect(whisperService.transcribeFile('/path/to/not-found.webm'))
      .rejects.toThrow('File not found');
  });

  test('should handle permission denied errors', async () => {
    await expect(whisperService.transcribeFile('/path/to/permission-denied.webm'))
      .rejects.toThrow('Permission denied');
  });

  test('should handle empty audio transcription', async () => {
    const result = await whisperService.transcribeFile('/path/to/empty-audio.webm');
    expect(result).toBe('');
  });

  test('should clean up temporary files even after errors', async () => {
    try {
      await whisperService.transcribeFile('/path/to/api-error.webm');
    } catch (error) {
      // Ignore the error
    }
    
    // Verify fs.unlinkSync was called to clean up temp files
    const fs = require('fs');
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  test('should handle invalid audio input format', async () => {
    await expect(whisperService.prepareAudioData(123))
      .rejects.toThrow('Invalid audio input format');
  });

  test('should handle errors when writing temporary files', async () => {
    await expect(whisperService.prepareAudioData(Buffer.from('data'), '/path/to/permission-denied/temp.webm'))
      .rejects.toThrow('Permission denied');
  });
});
