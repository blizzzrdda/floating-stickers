import { app, BrowserWindow, Menu, ipcMain, Tray, screen, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import StickerDataManager from './utils/stickerUtils.js';
import { debug, info, warn, error, setDebugEnabled, setLogLevel } from './utils/debugUtils.js';
import { performanceMonitor } from './utils/performanceMonitor.js';

// Enable debug mode during development
if (!app.isPackaged) {
  setDebugEnabled(true);
  setLogLevel('DEBUG');
  process.env.DEBUG_STICKER = 'true';
  info('App', 'Debug mode enabled for development');
}

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the user data path
const userDataPath = app.getPath('userData');

// Initialize the sticker data manager
const stickerManager = new StickerDataManager(userDataPath);

// Import services (will be initialized when imported)
// These services are initialized dynamically
let whisperService;
let preferencesService;
let audioRecordingService;

// We need to import the services after the app is ready
// because they use ES modules and require the app to be initialized
function initializeServices() {
  try {
    // Import and initialize services
    import('./services/audioRecordingService.js')
      .then(module => {
        audioRecordingService = module.default;
        console.log('Audio Recording Service initialized');
      })
      .catch(error => {
        console.error('Failed to initialize Audio Recording Service:', error);
      });

    import('./services/whisperService.js')
      .then(module => {
        whisperService = module.default;
        console.log('Whisper Service initialized');

        // Set up IPC handler for transcription
        ipcMain.handle('transcribe-audio', async (_, filePath, options) => {
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

            const transcription = await whisperService.transcribeFile(filePath, transcriptionOptions);
            return { success: true, text: transcription };
          } catch (error) {
            console.error('Transcription error:', error);
            return { success: false, error: error.message };
          }
        });
      })
      .catch(error => {
        console.error('Failed to initialize Whisper Service:', error);
      });

    // Initialize preferences service
    import('./services/preferencesService.js')
      .then(module => {
        preferencesService = module.default;
        console.log('Preferences Service initialized');

        // Set up IPC handlers for preferences
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

        ipcMain.handle('set-preference', async (_, key, value) => {
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

        ipcMain.handle('set-preferences', async (_, prefsObject) => {
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
      })
      .catch(error => {
        console.error('Failed to initialize Preferences Service:', error);
      });
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

let mainWindow;
let tray = null;
let stickerWindows = new Map(); // Map to track sticker windows

// Set a flag to track if the app is quitting
app.isQuitting = false;

function createWindow() {
  // Create the browser window (invisible manager window)
  mainWindow = new BrowserWindow({
    width: 300,
    height: 150,
    show: false, // Hide the main window initially
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    skipTaskbar: true, // Don't show in taskbar
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#2a2a3a',
    title: 'FloatingStickers'
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Make window draggable
  mainWindow.setMenuBarVisibility(false);

  // Handle window close to minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // Create system tray
  createTray();
}

function createTray() {
  // Use the Electron default app icon based on platform
  let trayIcon;

  if (process.platform === 'darwin') {
    // macOS
    trayIcon = path.join(__dirname, 'icon.png');
    if (!fs.existsSync(trayIcon)) {
      // Use system default on macOS if icon.png doesn't exist
      trayIcon = path.join(process.resourcesPath, 'electron.icns');
    }
  } else if (process.platform === 'win32') {
    // Windows
    trayIcon = path.join(__dirname, 'icon.png');
    if (!fs.existsSync(trayIcon)) {
      // Use a different approach for Windows if icon doesn't exist
      trayIcon = path.join(process.resourcesPath, 'electron.ico');
    }
  } else {
    // Linux and other platforms
    trayIcon = path.join(__dirname, 'icon.png');
    if (!fs.existsSync(trayIcon)) {
      trayIcon = path.join(process.resourcesPath, 'electron.png');
    }
  }

  try {
    // Destroy existing tray if it exists
    if (tray !== null) {
      tray.destroy();
    }

    // Create new tray with icon
    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Add New Sticker',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          createStickerWindow();
        }
      },
      {
        label: 'Toggle Visibility',
        accelerator: 'CmdOrCtrl+M',
        click: () => {
          toggleStickersVisibility();
        }
      },
      {
        label: 'Re-align Stickers',
        accelerator: 'CmdOrCtrl+,',
        click: () => {
          realignStickers();
        }
      },
      { type: 'separator' },
      {
        label: 'Exit',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setToolTip('FloatingStickers');
    tray.setContextMenu(contextMenu);

    // Add click handler for Windows to show context menu on left-click as well
    if (process.platform === 'win32') {
      tray.on('click', () => {
        tray.popUpContextMenu();
      });
    }
  } catch (error) {
    console.error('Error creating tray:', error);
    // Create a simple window instead as fallback
    createSimpleControlWindow();
  }
}

// Fallback function in case tray creation fails
function createSimpleControlWindow() {
  console.log('Creating simple control window as fallback...');

  // Make the main window visible as a fallback option
  if (mainWindow) {
    mainWindow.setSize(300, 150);
    mainWindow.center();
    mainWindow.show();

    // Add a menu to the window
    const menu = Menu.buildFromTemplate([
      {
        label: 'Stickers',
        submenu: [
          {
            label: 'Add New Sticker',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              createStickerWindow();
            }
          },
          {
            label: 'Toggle Visibility',
            accelerator: 'CmdOrCtrl+M',
            click: () => {
              toggleStickersVisibility();
            }
          },
          {
            label: 'Re-align Stickers',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              realignStickers();
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            click: () => {
              app.quit();
            }
          }
        ]
      }
    ]);
    Menu.setApplicationMenu(menu);
  }
}

function createStickerWindow(stickerData = null) {
  // Get all available displays
  const displays = screen.getAllDisplays();

  // Determine which display to use (prefer second display if available)
  const targetDisplay = displays.length > 1 ? displays[1] : displays[0];
  const workArea = targetDisplay.workArea;

  let x, y;
  const GRID_SIZE = 20;
  const stickerWidth = 250;
  const stickerHeight = 80; // Header (40px) + single line of text (40px)

  if (stickerData?.position) {
    // Use position from sticker data
    x = stickerData.position.x;
    y = stickerData.position.y;

    // Check if the sticker is on any display
    let onAnyDisplay = false;
    for (const display of displays) {
      const bounds = display.bounds;
      if (x >= bounds.x && x < bounds.x + bounds.width &&
          y >= bounds.y && y < bounds.y + bounds.height) {
        onAnyDisplay = true;
        break;
      }
    }

    // If not on any display, adjust to target display
    if (!onAnyDisplay) {
      x = workArea.x + GRID_SIZE;
      y = workArea.y + GRID_SIZE;
    }
  } else {
    // Calculate initial position based on existing stickers
    let lowestY = workArea.y + GRID_SIZE;

    // Check current active sticker windows to ensure proper stacking
    if (stickerWindows.size > 0) {
      stickerWindows.forEach(win => {
        if (win && !win.isDestroyed()) {
          const [winX, winY] = win.getPosition();

          // Check if this sticker is on the target display
          if (winX >= workArea.x && winX < workArea.x + workArea.width &&
              winY >= workArea.y && winY < workArea.y + workArea.height) {
            // Get the window's height (or use default)
            const winHeight = win.getSize()[1] || stickerHeight;
            const bottom = winY + winHeight + GRID_SIZE;

            if (bottom > lowestY) {
              lowestY = bottom;
            }
          }
        }
      });
    }

    // Set the position for the new sticker
    x = workArea.x + GRID_SIZE;
    y = lowestY + GRID_SIZE; // Stack new stickers below existing ones
  }

  // Create a unique ID for this sticker if it doesn't have one
  const stickerId = stickerData?.id || Date.now().toString();

  // Create the sticker window
  const stickerWindow = new BrowserWindow({
    width: stickerData?.size?.width || stickerWidth,
    height: stickerData?.size?.height || stickerHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-sticker.js')
    },
    alwaysOnTop: false,
    skipTaskbar: true,
    show: false, // Don't show until everything is ready
  });

  // Track this sticker window by its ID
  stickerWindows.set(stickerId, stickerWindow);

  // Load the sticker HTML file
  stickerWindow.loadFile('sticker.html');

  // Set a minimum size
  stickerWindow.setMinimumSize(150, 80);

  // When the window is ready to show
  stickerWindow.once('ready-to-show', () => {
    console.debug(`Sticker window ready to show: ID=${stickerId}`);

    // Prepare data to send to the sticker window
    const dataToSend = {
      id: stickerId,
      content: stickerData?.content || '',
      position: { x, y },
      size: {
        width: stickerData?.size?.width || stickerWidth,
        height: stickerData?.size?.height || stickerHeight
      }
    };

    // Log the data being sent to the sticker window
    console.debug(`Sending data to sticker window ID=${stickerId}:`, {
      id: dataToSend.id,
      contentLength: dataToSend.content ? dataToSend.content : 'n/a',
      position: dataToSend.position,
      size: dataToSend.size
    });

    // Send the data to the sticker window
    stickerWindow.webContents.send('sticker-data', dataToSend);

    // Show the window
    console.debug(`Showing sticker window ID=${stickerId}`);
    stickerWindow.show();

    // Auto-align stickers if this is a new sticker (not being restored from saved data)
    if (!stickerData || !stickerData.id) {
      console.debug('New sticker created, will auto-align after 100ms');
      // Small delay to ensure the window is fully rendered before alignment
      setTimeout(() => realignStickers(), 100);
    }
  });

  // When the sticker is closed
  stickerWindow.on('closed', () => {
    // Remove from our tracking Map
    stickerWindows.delete(stickerId);
  });

  // When the sticker is moved
  stickerWindow.on('moved', () => {
    if (stickerWindow.isDestroyed()) return;

    // Get the new position
    const [newX, newY] = stickerWindow.getPosition();

    // Update our position tracking
    const updatedPosition = { x: newX, y: newY };

    // Log position update for debugging
    console.log(`Sticker ${stickerId} moved to position:`, updatedPosition);

    // We'll let the renderer process update this in the file
    stickerWindow.webContents.send('position-updated', updatedPosition);
  });

  // Also track resize events to ensure size is saved correctly
  stickerWindow.on('resize', () => {
    if (stickerWindow.isDestroyed()) return;

    // Get the new size
    const [newWidth, newHeight] = stickerWindow.getSize();

    // Update size tracking
    const updatedSize = { width: newWidth, height: newHeight };

    // Send to renderer
    stickerWindow.webContents.send('size-updated', updatedSize);
  });

  // Return the ID we assigned to this sticker
  return stickerId;
}

// Import environment utilities
import { isDevelopment } from './utils/environment.js';

// Conditionally import test loader in development mode
let testLoader = null;
if (isDevelopment()) {
  import('./test-loader.js')
    .then(module => {
      testLoader = module.default;
      info('App', 'Test loader initialized in development mode');
    })
    .catch(err => {
      error('App', 'Failed to initialize test loader:', err);
    });
}

// When Electron has finished initialization
app.whenReady().then(async () => {
  createWindow();

  // Initialize our services
  initializeServices();

  // Load saved stickers from file
  await loadSavedStickers();

  // Register global shortcuts
  globalShortcut.register('CommandOrControl+N', () => {
    createStickerWindow();
  });

  globalShortcut.register('CommandOrControl+M', () => {
    toggleStickersVisibility();
  });

  globalShortcut.register('CommandOrControl+,', () => {
    realignStickers();
  });

  // Run tests in development mode
  if (isDevelopment() && testLoader) {
    info('App', 'Running tests in development mode');
    // Load and run tests after a delay to ensure app is fully initialized
    setTimeout(() => {
      testLoader.runTests();
    }, 1000);
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Use performance monitoring for sticker loading

// Load stickers from file and create sticker windows
async function loadSavedStickers() {
  console.log('Loading stickers data...');

  // Start performance monitoring
  performanceMonitor.mark('loadSavedStickers-start');

  try {
    // Check if sticker data files exist
    const layoutPath = stickerManager.layoutFilePath;
    const contentPath = stickerManager.contentFilePath;
    const layoutExists = fs.existsSync(layoutPath);
    const contentExists = fs.existsSync(contentPath);

    console.log(`Sticker data files: layout=${layoutExists ? 'exists' : 'missing'}, content=${contentExists ? 'exists' : 'missing'}`);
    console.log(`Layout path: ${layoutPath}`);
    console.log(`Content path: ${contentPath}`);

    // Load the merged sticker data
    console.log('Calling stickerManager.loadStickerData()');
    performanceMonitor.mark('loadStickerData-start');
    const stickers = await stickerManager.loadStickerData({ showErrors: true });
    performanceMonitor.measure('loadStickerData', 'loadStickerData-start');

    if (!Array.isArray(stickers)) {
      console.error('Loaded sticker data is not an array, skipping window creation');
      return;
    }

    console.info(`Loading ${stickers.length} stickers`);

    // If no stickers found, don't do anything
    if (stickers.length === 0) {
      console.info('No stickers found to load');
      return;
    }

    // Log details about each sticker for debugging
    stickers.forEach((sticker, index) => {
      if (sticker && sticker.id) {
        const contentLength = sticker.content ? sticker.content.length : 0;
        console.debug(`Sticker ${index}: ID=${sticker.id}, Content length=${contentLength}, ` +
          `Position=(${sticker.position?.x || 0},${sticker.position?.y || 0}), ` +
          `Size=(${sticker.size?.width || 250}x${sticker.size?.height || 80})`);
      } else {
        console.warn(`Invalid sticker at index ${index}:`, sticker);
      }
    });

    // Add a small delay to ensure the app is fully initialized before creating sticker windows
    console.debug('Waiting 500ms before creating sticker windows...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create windows for each sticker
    performanceMonitor.mark('createStickerWindows-start');

    // Use a more efficient approach for creating multiple stickers
    const createStickersSequentially = async (stickers, index = 0) => {
      if (index >= stickers.length) {
        performanceMonitor.measure('createStickerWindows', 'createStickerWindows-start');
        return;
      }

      const sticker = stickers[index];

      if (!sticker || !sticker.id) {
        console.warn('Skipping invalid sticker data:', sticker);
        // Continue with next sticker
        return createStickersSequentially(stickers, index + 1);
      }

      try {
        // Create the sticker window
        console.log(`Creating window for sticker ID=${sticker.id} (${index + 1}/${stickers.length})`);
        performanceMonitor.mark(`createSticker-${sticker.id}-start`);
        createStickerWindow(sticker);
        performanceMonitor.measure(`createSticker-${sticker.id}`, `createSticker-${sticker.id}-start`);

        // Add a small delay between creating each sticker to prevent overwhelming the system
        // Use a shorter delay for better performance
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (stickerError) {
        console.error(`Error creating sticker window for sticker ${sticker.id}:`, stickerError);
      }

      // Continue with next sticker
      return createStickersSequentially(stickers, index + 1);
    };

    // Start creating stickers
    await createStickersSequentially(stickers);

    console.info(`Successfully created ${stickers.length} sticker windows`);
  } catch (error) {
    console.error('Error loading stickers:', error);
    // Don't crash the app, just show an empty state
  }
}

// Toggle visibility of all stickers
function toggleStickersVisibility() {
  // Check if any stickers are visible
  let anyVisible = false;
  stickerWindows.forEach(win => {
    if (win && !win.isDestroyed() && win.isVisible()) {
      anyVisible = true;
    }
  });

  // If any are visible, hide all; otherwise, show all
  stickerWindows.forEach(win => {
    if (win && !win.isDestroyed()) {
      if (anyVisible) {
        win.hide();
      } else {
        win.show();
      }
    }
  });
}

// Settings window functionality has been removed

// Make sure we properly clean up before quitting
app.on('before-quit', async () => {
  app.isQuitting = true;

  console.log('[DEBUG] App is quitting, saving sticker data...');
  console.log(`[DEBUG] User data path: ${app.getPath('userData')}`);
  console.log(`[DEBUG] Layout file path: ${stickerManager.layoutFilePath}`);
  console.log(`[DEBUG] Content file path: ${stickerManager.contentFilePath}`);

  // Save all sticker data before quitting
  try {
    // Ensure the user data directory exists
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      console.log(`Creating user data directory: ${userDataPath}`);
      await fs.promises.mkdir(userDataPath, { recursive: true });
    }

    // Collect all sticker data
    const stickersToSave = [];
    const contentPromises = [];

    // First, request content from all sticker windows
    console.log(`[DEBUG] Requesting content from ${stickerWindows.size} sticker windows`);
    for (const [stickerId, stickerWindow] of stickerWindows.entries()) {
      if (stickerWindow && !stickerWindow.isDestroyed()) {
        console.log(`[DEBUG] Processing sticker ID=${stickerId}`);
        // Get current position and size
        const [x, y] = stickerWindow.getPosition();
        const [width, height] = stickerWindow.getSize();
        console.log(`[DEBUG] Sticker position: (${x}, ${y}), size: ${width}x${height}`);

        // Create a promise to get content from this sticker
        const contentPromise = new Promise(resolve => {
          console.log(`[DEBUG] Sending get-content request to sticker ID=${stickerId}`);
          // Request content from the renderer process
          stickerWindow.webContents.send('get-content');

          // Set up a one-time listener for the response
          ipcMain.once(`content-response-${stickerId}`, (_, content) => {
            console.log(`[DEBUG] Received content response from sticker ID=${stickerId}, content length: ${content ? content.length : 0}`);
            if (content && content.length > 0) {
              console.log(`[DEBUG] Content preview: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
            }
            resolve({
              id: stickerId,
              position: { x, y },
              size: { width, height },
              content: content || ''
            });
          });

          // Set a timeout in case the renderer doesn't respond
          setTimeout(() => {
            console.log(`[DEBUG] Timeout waiting for content from sticker ID=${stickerId}`);
            resolve({
              id: stickerId,
              position: { x, y },
              size: { width, height },
              content: ''
            });
          }, 1000); // 1000ms timeout (increased from 500ms)
        });

        contentPromises.push(contentPromise);
      }
    }

    // Wait for all content to be collected
    if (contentPromises.length > 0) {
      console.log(`Collecting content from ${contentPromises.length} stickers before quitting`);
      const results = await Promise.all(contentPromises);
      stickersToSave.push(...results);
    }

    // Only save if we have stickers
    if (stickersToSave.length > 0) {
      console.log(`Saving data for ${stickersToSave.length} stickers before quitting`);

      // Log the sticker data for debugging
      stickersToSave.forEach((sticker, index) => {
        console.log(`Sticker ${index + 1}/${stickersToSave.length}: ID=${sticker.id}, Content length=${sticker.content ? sticker.content.length : 0}`);
      });

      // Save both layout and content data
      const layoutData = stickersToSave.map(s => ({
        id: s.id,
        position: s.position,
        size: s.size
      }));

      const contentData = stickersToSave.map(s => ({
        id: s.id,
        content: s.content || ''
      }));

      console.log(`Layout data: ${layoutData.length} items`);
      console.log(`Content data: ${contentData.length} items`);
      console.log(`Layout file path: ${stickerManager.layoutFilePath}`);
      console.log(`Content file path: ${stickerManager.contentFilePath}`);

      // Save both files
      try {
        const layoutSaved = await stickerManager.saveLayoutData(layoutData);
        const contentSaved = await stickerManager.saveContentData(contentData);

        console.log(`Save results: layout=${layoutSaved}, content=${contentSaved}`);

        if (!layoutSaved || !contentSaved) {
          console.error('Failed to save sticker data before quitting');
        }
      } catch (saveError) {
        console.error('Error during save operation:', saveError);
      }
    } else {
      console.log('No stickers to save before quitting');
    }
  } catch (error) {
    console.error('Error saving sticker data before quit:', error);
  }

  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    // On Windows and Linux, quitting all windows should quit the app
    app.quit();
  }
});

// IPC for saving stickers data to file system
ipcMain.handle('save-stickers', async (_, stickersData) => {
  try {
    if (!Array.isArray(stickersData)) {
      return { success: false, error: 'Invalid data format' };
    }

    // Split into layout and content
    const layoutData = stickersData.map(sticker => ({
      id: String(sticker.id || Date.now()),
      position: {
        x: Number(sticker.position?.x || 0),
        y: Number(sticker.position?.y || 0)
      },
      size: {
        width: Number(sticker.size?.width || 250),
        height: Number(sticker.size?.height || 80)
      }
    }));

    const contentData = stickersData.map(sticker => ({
      id: String(sticker.id || Date.now()),
      content: String(sticker.content || '')
    }));

    // Save both files
    const layoutSaved = await stickerManager.saveLayoutData(layoutData);
    const contentSaved = await stickerManager.saveContentData(contentData);

    return {
      success: layoutSaved && contentSaved,
      layoutSaved,
      contentSaved
    };
  } catch (error) {
    console.error('Error saving stickers:', error);
    return { success: false, error: error.message };
  }
});

// IPC for loading stickers data from file system
ipcMain.handle('load-stickers', async () => {
  try {
    // Load the merged sticker data
    const mergedData = await stickerManager.loadStickerData();
    return { success: true, data: mergedData };
  } catch (error) {
    console.error('Error loading stickers:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// IPC for creating a new sticker
ipcMain.handle('create-sticker', async (_, stickerData) => {
  console.log('[DEBUG] Creating new sticker with data:', stickerData ? { id: stickerData.id } : 'undefined');

  // Log content details if available
  if (stickerData && stickerData.content) {
    console.log(`[DEBUG] Initial content: length=${stickerData.content.length}`);
    if (stickerData.content.length > 0) {
      console.log(`[DEBUG] Content preview: "${stickerData.content.substring(0, 50)}${stickerData.content.length > 50 ? '...' : ''}"`);
    }
  }

  try {
    // Create the sticker window
    console.log(`[DEBUG] Calling createStickerWindow`);
    const stickerId = createStickerWindow(stickerData);
    console.log(`[DEBUG] Created sticker with ID=${stickerId}`);

    // Save the sticker data immediately to ensure it's persisted
    if (stickerData) {
      const sanitizedData = {
        id: stickerId,
        content: stickerData.content || '',
        position: stickerData.position || { x: 0, y: 0 },
        size: stickerData.size || { width: 250, height: 80 }
      };

      // Save the sticker data
      console.log(`[DEBUG] Saving new sticker data for ID=${stickerId}`);
      console.log(`[DEBUG] Sanitized data:`, {
        id: sanitizedData.id,
        content: sanitizedData.content ? `${sanitizedData.content.substring(0, 20)}... (${sanitizedData.content.length} chars)` : '(empty)',
        position: sanitizedData.position,
        size: sanitizedData.size
      });

      const result = await stickerManager.updateSticker(sanitizedData);
      console.log(`[DEBUG] Save result:`, result);

      if (!result.success) {
        console.error(`[ERROR] Failed to save new sticker data:`, result.error);
      }
    }

    return { success: true, id: stickerId };
  } catch (error) {
    console.error('[ERROR] Error creating new sticker:', error);
    return { success: false, error: error.message };
  }
});

// IPC for updating sticker position and content
ipcMain.handle('update-sticker', async (_, stickerData) => {
  console.log(`[DEBUG] update-sticker IPC called for sticker ID=${stickerData?.id}`);

  try {
    // Validate sticker data
    if (!stickerData || typeof stickerData !== 'object') {
      console.error(`[ERROR] Invalid sticker data provided to update-sticker:`, stickerData);
      return { success: false, error: 'Invalid sticker data provided' };
    }

    // Log content details
    if (stickerData.content !== undefined) {
      console.log(`[DEBUG] Content to update: length=${stickerData.content ? stickerData.content.length : 0}`);
      if (stickerData.content && stickerData.content.length > 0) {
        console.log(`[DEBUG] Content preview: "${stickerData.content.substring(0, 50)}${stickerData.content.length > 50 ? '...' : ''}"`);
      }
    }

    // Use the sticker manager to update the sticker
    console.log(`[DEBUG] Calling stickerManager.updateSticker`);
    const result = await stickerManager.updateSticker(stickerData);
    console.log(`[DEBUG] updateSticker result:`, result);
    return result;
  } catch (error) {
    console.error('[ERROR] Error updating sticker:', error);
    return { success: false, error: error.message };
  }
});

// IPC for removing a sticker
ipcMain.handle('remove-sticker', async (_, stickerId) => {
  try {
    // Use the sticker manager to remove the sticker
    const result = await stickerManager.removeSticker(stickerId);
    return result;
  } catch (error) {
    console.error('Error removing sticker:', error);
    return { success: false, error: error.message };
  }
});

// IPC for toggling stickers visibility
ipcMain.handle('toggle-stickers-visibility', () => {
  toggleStickersVisibility();
  return { success: true };
});

// IPC for showing all stickers (keeping this for compatibility)
ipcMain.handle('show-all-stickers', () => {
  stickerWindows.forEach(win => {
    if (win && !win.isDestroyed()) {
      win.show();
    }
  });
  return { success: true };
});

// IPC for hiding all stickers (keeping this for compatibility)
ipcMain.handle('hide-all-stickers', () => {
  stickerWindows.forEach(win => {
    if (win && !win.isDestroyed()) {
      win.hide();
    }
  });
  return { success: true };
});

// IPC for realigning stickers
ipcMain.handle('realign-stickers', () => {
  realignStickers();
  return { success: true };
});

// Function to realign stickers in a vertical-first layout with multi-screen support
function realignStickers() {
  // Start performance monitoring
  performanceMonitor.mark('realignStickers-start');

  const GRID_SIZE = 20;
  const BOTTOM_MARGIN = 200; // Space to leave at the bottom of the screen

  // Get all available displays
  const displays = screen.getAllDisplays();

  // Collect valid sticker windows
  const validStickers = Array.from(stickerWindows.values()).filter(win =>
    win && !win.isDestroyed()
  );

  if (validStickers.length === 0) {
    performanceMonitor.measure('realignStickers-empty', 'realignStickers-start');
    return; // No stickers to align
  }

  // Group stickers by the display they're currently on
  performanceMonitor.mark('groupStickersByDisplay-start');
  const stickersByDisplay = groupStickersByDisplay(validStickers, displays);
  performanceMonitor.measure('groupStickersByDisplay', 'groupStickersByDisplay-start');

  // Process and align stickers on each display
  performanceMonitor.mark('alignStickers-start');
  displays.forEach(display => {
    const stickersForDisplay = stickersByDisplay[display.id] || [];
    if (stickersForDisplay.length > 0) {
      alignStickersOnDisplay(display, stickersForDisplay, GRID_SIZE, BOTTOM_MARGIN);
    }
  });
  performanceMonitor.measure('alignStickers', 'alignStickers-start');

  // Complete performance measurement
  performanceMonitor.measure('realignStickers-total', 'realignStickers-start');
}

// Helper: Group stickers by the display they're on
function groupStickersByDisplay(stickers, displays) {
  const stickersByDisplay = {};

  stickers.forEach(win => {
    const [winX, winY] = win.getPosition();

    // Find which display contains this sticker
    let targetDisplay = displays.find(display => {
      const bounds = display.bounds;
      return winX >= bounds.x && winX < bounds.x + bounds.width &&
             winY >= bounds.y && winY < bounds.y + bounds.height;
    });

    // If sticker isn't on any display, assign it to the default display (second if available)
    if (!targetDisplay) {
      targetDisplay = displays.length > 1 ? displays[1] : displays[0];
    }

    const displayId = targetDisplay.id;
    if (!stickersByDisplay[displayId]) {
      stickersByDisplay[displayId] = [];
    }

    stickersByDisplay[displayId].push(win);
  });

  return stickersByDisplay;
}

// Helper: Align stickers on a specific display
function alignStickersOnDisplay(display, stickers, gridSize, bottomMargin) {
  if (stickers.length === 0) return;

  performanceMonitor.mark(`alignDisplay-${display.id}-start`);

  // Get display work area (accounts for taskbar, etc.)
  const workArea = screen.getDisplayMatching(display.bounds).workArea;
  const maxHeight = workArea.height - bottomMargin;

  // Sort stickers by their vertical position (top to bottom)
  // This is more efficient than repeatedly calling getPosition in the sort function
  const stickersWithPosition = stickers.map(win => {
    const [x, y] = win.getPosition();
    return { win, x, y };
  });

  stickersWithPosition.sort((a, b) => a.y - b.y);

  // Use the horizontal position of the first sticker as the alignment point
  const baseX = stickersWithPosition[0].x;
  let currentY = workArea.y + gridSize;
  let maxWidthInColumn = 0;

  // Pre-calculate sizes to avoid repeated calls to getSize
  const stickerSizes = stickersWithPosition.map(({ win }) => {
    return win.getSize();
  });

  // Position each sticker
  stickersWithPosition.forEach(({ win }, index) => {
    const [winWidth, winHeight] = stickerSizes[index];

    // Start a new column if this sticker would exceed screen height
    if (currentY + winHeight > workArea.y + maxHeight && index > 0) {
      currentY = workArea.y + gridSize;
      maxWidthInColumn = 0;
    }

    // Calculate the new position
    const newX = baseX + (maxWidthInColumn > 0 ? maxWidthInColumn + gridSize : 0);

    // Position the sticker
    win.setPosition(newX, currentY);

    // Update tracking variables
    maxWidthInColumn = Math.max(maxWidthInColumn, winWidth);
    currentY += winHeight + gridSize;
  });

  performanceMonitor.measure(`alignDisplay-${display.id}`, `alignDisplay-${display.id}-start`);
}