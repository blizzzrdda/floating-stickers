const { contextBridge, ipcRenderer } = require('electron');

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
  }
});