/**
 * Mock for the electron module in tests
 */

// Create mock functions
const mockHandle = () => {};
const mockInvoke = () => {};
const mockOn = () => {};
const mockGetPath = () => '/mock/path';

// Create mock electron module
const electron = {
  app: {
    getPath: mockGetPath,
    isPackaged: false,
    whenReady: () => Promise.resolve(),
    on: () => {},
    quit: () => {}
  },
  ipcMain: {
    handle: mockHandle,
    on: mockOn
  },
  ipcRenderer: {
    invoke: mockInvoke,
    on: mockOn,
    send: () => {}
  },
  BrowserWindow: function() {
    return {
      loadFile: () => {},
      on: () => {},
      webContents: {
        send: () => {},
        on: () => {}
      },
      show: () => {},
      hide: () => {},
      close: () => {},
      isDestroyed: () => false,
      getPosition: () => [0, 0],
      getSize: () => [250, 80],
      setMinimumSize: () => {}
    };
  },
  contextBridge: {
    exposeInMainWorld: () => {}
  },
  Menu: {
    buildFromTemplate: () => ({}),
    setApplicationMenu: () => {}
  },
  Tray: function() {
    return {
      setToolTip: () => {},
      setContextMenu: () => {},
      on: () => {},
      destroy: () => {}
    };
  },
  screen: {
    getAllDisplays: () => [
      {
        id: 1,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1040 }
      }
    ]
  },
  globalShortcut: {
    register: () => {},
    unregisterAll: () => {}
  }
};

// Reset all mocks
function resetMocks() {
  // Reset app.isPackaged
  electron.app.isPackaged = false;
}

export { resetMocks };
export default electron;
