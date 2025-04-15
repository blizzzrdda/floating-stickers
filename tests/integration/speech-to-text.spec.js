/**
 * Integration test for speech-to-text functionality
 */

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  getFirstWindow,
  createSticker
} from './helpers/electron-helper.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

// Mock audio file for testing
const mockAudioPath = path.join(projectRoot, 'tests', 'fixtures', 'mock-audio.webm');

test.describe('Speech-to-Text Functionality', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch the Electron app
    electronApp = await launchElectronApp();
    
    // Get the first window
    window = await getFirstWindow(electronApp);
    
    // Create a sticker for testing
    await createSticker(window, { text: '' });
    
    // Create mock audio file directory if it doesn't exist
    const fixturesDir = path.join(projectRoot, 'tests', 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
  });

  test.afterEach(async () => {
    // Close the Electron app if it was launched
    if (electronApp) {
      await electronApp.close().catch(err => console.error('Error closing Electron app:', err));
    }
  });

  test('should show microphone button in sticker', async () => {
    // Verify the microphone button is visible
    const microphoneButton = await window.$('.microphone-button');
    expect(await microphoneButton.isVisible()).toBe(true);
  });

  test('should change microphone button appearance when clicked', async () => {
    // Mock the MediaRecorder API
    await window.evaluate(() => {
      // Mock MediaRecorder
      window.MediaRecorder = class MockMediaRecorder {
        constructor() {
          this.state = 'inactive';
          setTimeout(() => {
            if (this.ondataavailable) {
              this.ondataavailable({ data: new Blob() });
            }
          }, 100);
        }
        
        start() {
          this.state = 'recording';
        }
        
        stop() {
          this.state = 'inactive';
          if (this.onstop) {
            this.onstop();
          }
        }
      };
      
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{
            stop: () => {}
          }]
        };
      };
    });
    
    // Click the microphone button
    await window.click('.microphone-button');
    
    // Verify the button has the recording class
    const hasRecordingClass = await window.evaluate(() => {
      return document.querySelector('.microphone-button').classList.contains('recording');
    });
    
    expect(hasRecordingClass).toBe(true);
    
    // Click again to stop recording
    await window.click('.microphone-button');
    
    // Verify the button has the processing class
    const hasProcessingClass = await window.evaluate(() => {
      return document.querySelector('.microphone-button').classList.contains('processing');
    });
    
    expect(hasProcessingClass).toBe(true);
  });

  test('should handle keyboard shortcut for microphone', async () => {
    // Mock the MediaRecorder API
    await window.evaluate(() => {
      // Mock MediaRecorder
      window.MediaRecorder = class MockMediaRecorder {
        constructor() {
          this.state = 'inactive';
          setTimeout(() => {
            if (this.ondataavailable) {
              this.ondataavailable({ data: new Blob() });
            }
          }, 100);
        }
        
        start() {
          this.state = 'recording';
        }
        
        stop() {
          this.state = 'inactive';
          if (this.onstop) {
            this.onstop();
          }
        }
      };
      
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{
            stop: () => {}
          }]
        };
      };
    });
    
    // Press Ctrl+Shift+M to start recording
    await window.keyboard.press('Control+Shift+M');
    
    // Verify the button has the recording class
    const hasRecordingClass = await window.evaluate(() => {
      return document.querySelector('.microphone-button').classList.contains('recording');
    });
    
    expect(hasRecordingClass).toBe(true);
    
    // Press Ctrl+Shift+M again to stop recording
    await window.keyboard.press('Control+Shift+M');
    
    // Verify the button has the processing class
    const hasProcessingClass = await window.evaluate(() => {
      return document.querySelector('.microphone-button').classList.contains('processing');
    });
    
    expect(hasProcessingClass).toBe(true);
  });

  test('should handle transcription errors gracefully', async () => {
    // Mock the transcription API to fail
    await window.evaluate(() => {
      // Mock the transcription API
      window.stickerAPI.transcribeAudio = async () => {
        return { success: false, error: 'Transcription failed' };
      };
      
      // Mock MediaRecorder
      window.MediaRecorder = class MockMediaRecorder {
        constructor() {
          this.state = 'inactive';
          setTimeout(() => {
            if (this.ondataavailable) {
              this.ondataavailable({ data: new Blob() });
            }
          }, 100);
        }
        
        start() {
          this.state = 'recording';
        }
        
        stop() {
          this.state = 'inactive';
          if (this.onstop) {
            this.onstop();
          }
        }
      };
      
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{
            stop: () => {}
          }]
        };
      };
      
      // Mock saveRecordedAudio
      window.stickerAPI.saveRecordedAudio = async () => {
        return { success: true, filePath: '/mock/path/audio.webm' };
      };
    });
    
    // Spy on window.alert
    await window.evaluate(() => {
      window.originalAlert = window.alert;
      window.alertCalls = [];
      window.alert = (message) => {
        window.alertCalls.push(message);
      };
    });
    
    // Click the microphone button to start recording
    await window.click('.microphone-button');
    
    // Click again to stop recording
    await window.click('.microphone-button');
    
    // Wait for processing to complete
    await window.waitForTimeout(500);
    
    // Check if alert was called with error message
    const alertCalls = await window.evaluate(() => window.alertCalls);
    expect(alertCalls.some(call => call.includes('Transcription failed'))).toBe(true);
    
    // Restore original alert
    await window.evaluate(() => {
      window.alert = window.originalAlert;
    });
  });

  test('should insert transcribed text into sticker', async () => {
    // Mock the transcription API
    await window.evaluate(() => {
      // Mock the transcription API
      window.stickerAPI.transcribeAudio = async () => {
        return { success: true, text: 'This is a mock transcription' };
      };
      
      // Mock MediaRecorder
      window.MediaRecorder = class MockMediaRecorder {
        constructor() {
          this.state = 'inactive';
          setTimeout(() => {
            if (this.ondataavailable) {
              this.ondataavailable({ data: new Blob() });
            }
          }, 100);
        }
        
        start() {
          this.state = 'recording';
        }
        
        stop() {
          this.state = 'inactive';
          if (this.onstop) {
            this.onstop();
          }
        }
      };
      
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{
            stop: () => {}
          }]
        };
      };
      
      // Mock saveRecordedAudio
      window.stickerAPI.saveRecordedAudio = async () => {
        return { success: true, filePath: '/mock/path/audio.webm' };
      };
    });
    
    // Click the microphone button to start recording
    await window.click('.microphone-button');
    
    // Click again to stop recording
    await window.click('.microphone-button');
    
    // Wait for processing to complete
    await window.waitForTimeout(500);
    
    // Check if the transcribed text was inserted
    const content = await window.textContent('.sticker-content');
    expect(content).toBe('This is a mock transcription');
  });

  test('should append transcribed text to existing content', async () => {
    // Set initial content
    await window.evaluate(() => {
      document.querySelector('.sticker-content').textContent = 'Initial content. ';
    });
    
    // Mock the transcription API
    await window.evaluate(() => {
      // Mock the transcription API
      window.stickerAPI.transcribeAudio = async () => {
        return { success: true, text: 'This is additional content.' };
      };
      
      // Mock MediaRecorder
      window.MediaRecorder = class MockMediaRecorder {
        constructor() {
          this.state = 'inactive';
          setTimeout(() => {
            if (this.ondataavailable) {
              this.ondataavailable({ data: new Blob() });
            }
          }, 100);
        }
        
        start() {
          this.state = 'recording';
        }
        
        stop() {
          this.state = 'inactive';
          if (this.onstop) {
            this.onstop();
          }
        }
      };
      
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{
            stop: () => {}
          }]
        };
      };
      
      // Mock saveRecordedAudio
      window.stickerAPI.saveRecordedAudio = async () => {
        return { success: true, filePath: '/mock/path/audio.webm' };
      };
      
      // Set text append mode to true
      if (window.audioRecorder) {
        window.audioRecorder.preferences = {
          textAppendMode: true
        };
      }
    });
    
    // Click the microphone button to start recording
    await window.click('.microphone-button');
    
    // Click again to stop recording
    await window.click('.microphone-button');
    
    // Wait for processing to complete
    await window.waitForTimeout(500);
    
    // Check if the transcribed text was appended
    const content = await window.textContent('.sticker-content');
    expect(content).toBe('Initial content. This is additional content.');
  });
});
