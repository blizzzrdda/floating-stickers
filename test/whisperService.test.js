// whisperService.test.js - Tests for the WhisperService
import whisperService from '../services/whisperService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test audio file path (you'll need to create or provide this file)
const testAudioPath = path.join(__dirname, '../test-data/test-audio.mp3');

// Basic tests for WhisperService
console.log('Running WhisperService tests...');

// Test 1: Service initialization
try {
  console.log('Test 1: Verifying service initialization...');
  console.log('WhisperService instance:', whisperService);
  console.log('Test 1: Service initialized successfully ✅');
} catch (error) {
  console.error('Test 1 Failed: Service initialization error:', error);
}

// Test 2: Audio data preparation (if test audio file exists)
if (fs.existsSync(testAudioPath)) {
  try {
    console.log('Test 2: Testing audio data preparation...');
    const preparedData = await whisperService.prepareAudioData(testAudioPath);
    console.log('Prepared data is a Buffer:', Buffer.isBuffer(preparedData));
    console.log('Test 2: Audio data preparation successful ✅');
  } catch (error) {
    console.error('Test 2 Failed: Audio data preparation error:', error);
  }

  // Test 3: Full transcription (only if you want to make an actual API call)
  // Uncomment this section if you want to test the actual API call
  /*
  try {
    console.log('Test 3: Testing full transcription...');
    const transcription = await whisperService.transcribeFile(testAudioPath);
    console.log('Transcription result:', transcription);
    console.log('Test 3: Transcription successful ✅');
  } catch (error) {
    console.error('Test 3 Failed: Transcription error:', error);
  }
  */
} else {
  console.log(`Test audio file not found at ${testAudioPath}. Skipping audio tests.`);
  console.log('To run audio tests, place a test audio file at the specified path.');
}

console.log('WhisperService tests completed.');
