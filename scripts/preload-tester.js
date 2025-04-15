// preload-tester.js
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('testerAPI', {
  // Get available microphones
  getAvailableMicrophones: () => {
    return ipcRenderer.invoke('get-available-microphones');
  },

  // Transcribe audio
  transcribeAudio: (filePath, options) => {
    return ipcRenderer.invoke('transcribe-audio', filePath, options);
  },

  // Save recorded audio
  saveRecordedAudio: (audioData) => {
    return ipcRenderer.invoke('save-recorded-audio', audioData);
  },

  // Get preferences
  getPreferences: () => {
    return ipcRenderer.invoke('get-preferences');
  },

  // Set preference
  setPreference: (key, value) => {
    return ipcRenderer.invoke('set-preference', key, value);
  },

  // Set preferences
  setPreferences: (prefsObject) => {
    return ipcRenderer.invoke('set-preferences', prefsObject);
  },

  // Reset preferences
  resetPreferences: () => {
    return ipcRenderer.invoke('reset-preferences');
  },

  // Get system info
  getSystemInfo: () => {
    return ipcRenderer.invoke('get-system-info');
  },

  // Save test results
  saveTestResults: (results) => {
    return ipcRenderer.invoke('save-test-results', results);
  }
});
