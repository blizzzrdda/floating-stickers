import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('stickerAPI', {
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
