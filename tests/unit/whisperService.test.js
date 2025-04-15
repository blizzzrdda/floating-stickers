// Import the whisper service
import whisperService from '../../services/whisperService.js';

describe('WhisperService', () => {
  test('WhisperService is defined', () => {
    expect(whisperService).toBeDefined();
  });
  
  test('WhisperService has required methods', () => {
    expect(typeof whisperService.transcribeFile).toBe('function');
    expect(typeof whisperService.prepareAudioData).toBe('function');
  });
});
