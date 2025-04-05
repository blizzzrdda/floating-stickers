const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Function to save stickers to file system
  saveStickers: (stickersData) => {
    return ipcRenderer.invoke('save-stickers', stickersData);
  },
  
  // Function to load stickers from file system
  loadStickers: () => {
    return ipcRenderer.invoke('load-stickers');
  },
  
  // Function to create a new sticker
  createSticker: (stickerData) => {
    return ipcRenderer.invoke('create-sticker', stickerData);
  },
  
  // Function to toggle stickers visibility
  toggleStickersVisibility: () => {
    return ipcRenderer.invoke('toggle-stickers-visibility');
  },
  
  // Function to show all stickers
  showAllStickers: () => {
    return ipcRenderer.invoke('show-all-stickers');
  },
  
  // Function to hide all stickers
  hideAllStickers: () => {
    return ipcRenderer.invoke('hide-all-stickers');
  },
  
  // Function to realign stickers
  realignStickers: () => {
    return ipcRenderer.invoke('realign-stickers');
  }
}); 