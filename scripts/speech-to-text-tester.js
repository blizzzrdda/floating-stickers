// speech-to-text-tester.js
// A utility script to help test the speech-to-text functionality

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Keep a global reference of the window object
let mainWindow;

// Create the test window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    title: 'Speech-to-Text Tester',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-tester.js')
    }
  });

  // Load the HTML file
  mainWindow.loadFile(path.join(__dirname, 'speech-to-text-tester.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize the app
app.whenReady().then(() => {
  createWindow();

  // Initialize services
  initializeServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Import services
let audioRecordingService;
let whisperService;
let preferencesService;

// Initialize services
async function initializeServices() {
  try {
    // Import and initialize services
    const audioRecordingModule = await import('../services/audioRecordingService.js');
    audioRecordingService = audioRecordingModule.default;
    console.log('Audio Recording Service initialized');

    const whisperModule = await import('../services/whisperService.js');
    whisperService = whisperModule.default;
    console.log('Whisper Service initialized');

    const preferencesModule = await import('../services/preferencesService.js');
    preferencesService = preferencesModule.default;
    console.log('Preferences Service initialized');

    // Set up IPC handlers
    setupIpcHandlers();
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

// Set up IPC handlers
function setupIpcHandlers() {
  // Get available microphones
  ipcMain.handle('get-available-microphones', async () => {
    try {
      // This is just a placeholder - actual implementation would depend on how
      // you enumerate microphones in your application
      return {
        success: true,
        message: 'This would return available microphones in a real implementation'
      };
    } catch (error) {
      console.error('Error getting microphones:', error);
      return { success: false, error: error.message };
    }
  });

  // Transcribe audio file
  ipcMain.handle('transcribe-audio', async (event, filePath, options) => {
    try {
      if (!whisperService) {
        throw new Error('Whisper Service not initialized');
      }

      // Get preferences for transcription
      let transcriptionOptions = { language: 'en' };

      // If preferences service is available, get language preference
      if (preferencesService) {
        const prefs = preferencesService.getPreferences();
        transcriptionOptions.language = prefs.language || 'en';
      }

      // Override with any provided options
      if (options) {
        transcriptionOptions = { ...transcriptionOptions, ...options };
      }

      console.log('Transcribing file:', filePath, 'with options:', transcriptionOptions);

      const transcription = await whisperService.transcribeFile(filePath, transcriptionOptions);
      return { success: true, text: transcription };
    } catch (error) {
      console.error('Transcription error:', error);
      return { success: false, error: error.message };
    }
  });

  // Save recorded audio
  ipcMain.handle('save-recorded-audio', async (event, audioData) => {
    try {
      if (!audioRecordingService) {
        throw new Error('Audio Recording Service not initialized');
      }

      const result = await audioRecordingService.saveAudio(audioData);
      return result;
    } catch (error) {
      console.error('Error saving audio:', error);
      return { success: false, error: error.message };
    }
  });

  // Get preferences
  ipcMain.handle('get-preferences', async () => {
    try {
      if (!preferencesService) {
        throw new Error('Preferences Service not initialized');
      }

      const preferences = preferencesService.getPreferences();
      return { success: true, preferences };
    } catch (error) {
      console.error('Error getting preferences:', error);
      return { success: false, error: error.message };
    }
  });

  // Set preference
  ipcMain.handle('set-preference', async (event, key, value) => {
    try {
      if (!preferencesService) {
        throw new Error('Preferences Service not initialized');
      }

      const success = preferencesService.setPreference(key, value);
      return { success };
    } catch (error) {
      console.error('Error setting preference:', error);
      return { success: false, error: error.message };
    }
  });

  // Set multiple preferences
  ipcMain.handle('set-preferences', async (event, prefsObject) => {
    try {
      if (!preferencesService) {
        throw new Error('Preferences Service not initialized');
      }

      const success = preferencesService.setPreferences(prefsObject);
      return { success };
    } catch (error) {
      console.error('Error setting preferences:', error);
      return { success: false, error: error.message };
    }
  });

  // Reset preferences
  ipcMain.handle('reset-preferences', async () => {
    try {
      if (!preferencesService) {
        throw new Error('Preferences Service not initialized');
      }

      const success = preferencesService.resetToDefaults();
      return { success };
    } catch (error) {
      console.error('Error resetting preferences:', error);
      return { success: false, error: error.message };
    }
  });

  // Get system info
  ipcMain.handle('get-system-info', async () => {
    try {
      const systemInfo = {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
        freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
        uptime: Math.round(os.uptime() / 3600) + ' hours'
      };

      return { success: true, systemInfo };
    } catch (error) {
      console.error('Error getting system info:', error);
      return { success: false, error: error.message };
    }
  });

  // Save test results
  ipcMain.handle('save-test-results', async (event, results) => {
    try {
      const resultsDir = path.join(app.getPath('userData'), 'test-results');

      // Create directory if it doesn't exist
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `speech-test-${timestamp}.json`;
      const filePath = path.join(resultsDir, filename);

      // Save results to file
      fs.writeFileSync(filePath, JSON.stringify(results, null, 2));

      return { success: true, filePath };
    } catch (error) {
      console.error('Error saving test results:', error);
      return { success: false, error: error.message };
    }
  });
}
