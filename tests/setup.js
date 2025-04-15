// Set up global test environment
global.__DEV__ = process.env.NODE_ENV !== 'production' && process.env.ELECTRON_IS_PACKAGED !== 'true';

// Log test environment
console.log(`Running tests in ${global.__DEV__ ? 'development' : 'production'} mode`);

// Skip tests if we're in production mode (packaged app)
if (process.env.NODE_ENV === 'production' || process.env.ELECTRON_IS_PACKAGED === 'true') {
  console.log('Skipping tests in production mode');

  // Set longer timeout for tests
  jest.setTimeout(10000);

  // Mock electron module for tests
  jest.mock('electron', () => ({
    app: {
      getPath: jest.fn().mockReturnValue('/mock/path'),
      isPackaged: true
    },
    ipcMain: {
      handle: jest.fn()
    },
    ipcRenderer: {
      invoke: jest.fn(),
      on: jest.fn()
    }
  }));
}
