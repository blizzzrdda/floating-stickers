import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('stickerAPI', {
  // Function to send content updates
  updateSticker: (stickerData) => {
    return ipcRenderer.invoke('update-sticker', stickerData);
  },

  // Function to close/remove a sticker
  removeSticker: (stickerId) => {
    return ipcRenderer.invoke('remove-sticker', stickerId);
  },

  // Receive sticker data from main process
  onStickerData: (callback) => {
    ipcRenderer.on('sticker-data', (_, data) => callback(data));
  },

  // Receive position updates from main process (when window is moved)
  onPositionUpdated: (callback) => {
    ipcRenderer.on('position-updated', (_, position) => callback(position));
  },

  // Receive size updates from main process (when window is resized)
  onSizeUpdated: (callback) => {
    ipcRenderer.on('size-updated', (_, size) => callback(size));
  },

  // Audio recording functions
  checkMicrophonePermission: () => {
    return ipcRenderer.invoke('check-microphone-permission');
  },

  requestMicrophonePermission: () => {
    return ipcRenderer.invoke('request-microphone-permission');
  },

  saveRecordedAudio: (audioData) => {
    return ipcRenderer.invoke('save-recorded-audio', audioData);
  },

  deleteTempAudio: (filePath) => {
    return ipcRenderer.invoke('delete-temp-audio', filePath);
  },

  // Speech-to-text functions
  transcribeAudio: (filePath, options) => {
    return ipcRenderer.invoke('transcribe-audio', filePath, options);
  },

  // Preferences functions
  getPreferences: () => {
    return ipcRenderer.invoke('get-preferences');
  },

  setPreference: (key, value) => {
    return ipcRenderer.invoke('set-preference', key, value);
  },

  setPreferences: (prefsObject) => {
    return ipcRenderer.invoke('set-preferences', prefsObject);
  },

  resetPreferences: () => {
    return ipcRenderer.invoke('reset-preferences');
  }
});