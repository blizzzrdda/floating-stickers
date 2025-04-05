const { app, BrowserWindow, Menu, ipcMain, Tray, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Define the stickers data file path in the user's data directory
const userDataPath = app.getPath('userData');
const stickersFilePath = path.join(userDataPath, 'stickers.json');

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
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Add New Sticker', 
        click: () => {
          createStickerWindow();
        } 
      },
      { 
        label: 'Show All Stickers', 
        click: () => {
          stickerWindows.forEach(win => {
            if (win && !win.isDestroyed()) {
              win.show();
            }
          });
        } 
      },
      { 
        label: 'Hide All Stickers', 
        click: () => {
          stickerWindows.forEach(win => {
            if (win && !win.isDestroyed()) {
              win.hide();
            }
          });
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
            click: () => {
              createStickerWindow();
            } 
          },
          { 
            label: 'Show All Stickers', 
            click: () => {
              stickerWindows.forEach(win => {
                if (win && !win.isDestroyed()) {
                  win.show();
                }
              });
            } 
          },
          { 
            label: 'Hide All Stickers', 
            click: () => {
              stickerWindows.forEach(win => {
                if (win && !win.isDestroyed()) {
                  win.hide();
                }
              });
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
  // Get screen dimensions
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  let x, y;
  const GRID_SIZE = 20;
  const stickerWidth = 250;
  const stickerHeight = 80; // Header (40px) + single line of text (40px)
  
  if (stickerData?.position) {
    // Use position from sticker data
    x = stickerData.position.x;
    y = stickerData.position.y;
  } else {
    // Get current stickers count for position calculation
    let existingStickers = [];
    if (fs.existsSync(stickersFilePath)) {
      try {
        const data = fs.readFileSync(stickersFilePath, 'utf8');
        existingStickers = JSON.parse(data);
      } catch (error) {
        console.error('Error reading stickers for positioning:', error);
      }
    }
    
    // Also check current active sticker windows to ensure proper stacking
    let lowestY = 0;
    
    // First check existing stickers from file
    if (existingStickers.length > 0) {
      existingStickers.forEach(sticker => {
        const bottom = sticker.position.y + (sticker.size?.height || stickerHeight);
        if (bottom > lowestY) {
          lowestY = bottom;
        }
      });
    }
    
    // Now check active sticker windows (these may not be saved yet)
    if (stickerWindows.size > 0) {
      stickerWindows.forEach(win => {
        if (win && !win.isDestroyed()) {
          const [winX, winY] = win.getPosition();
          const [winWidth, winHeight] = win.getSize();
          const bottom = winY + winHeight;
          
          if (bottom > lowestY) {
            lowestY = bottom;
          }
        }
      });
    }
    
    if (lowestY === 0) {
      // First sticker - center it horizontally
      x = Math.round((width / 2 - stickerWidth / 2) / GRID_SIZE) * GRID_SIZE;
      y = GRID_SIZE;
    } else {
      // Position the new sticker below the lowest one with padding
      x = Math.round((width / 2 - stickerWidth / 2) / GRID_SIZE) * GRID_SIZE;
      y = Math.round((lowestY + GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
    }
    
    // Ensure we're not placing stickers off-screen
    x = Math.min(x, width - stickerWidth);
    y = Math.min(y, height - stickerHeight);
  }
  
  // Set initial size based on whether this is a new or existing sticker
  const windowHeight = stickerData && stickerData.content ? 
                      (stickerData.size?.height || 250) : // Use existing size or default
                      stickerHeight;
  
  // Create a frameless window for the sticker
  const stickerWindow = new BrowserWindow({
    width: 250,
    height: windowHeight,
    x: x,
    y: y,
    frame: false, // No window frame
    transparent: true, // Transparent background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-sticker.js')
    },
    skipTaskbar: true, // Don't show in taskbar
    alwaysOnTop: true, // Stay on top
    resizable: true,
  });
  
  // Generate a unique ID for the sticker window
  const stickerId = stickerData?.id || Date.now().toString();
  
  // Load sticker HTML
  stickerWindow.loadFile('sticker.html');
  
  // Store the sticker window reference
  stickerWindows.set(stickerId, stickerWindow);
  
  // When the sticker window is ready, send the sticker data
  stickerWindow.webContents.on('did-finish-load', () => {
    if (stickerData) {
      stickerWindow.webContents.send('sticker-data', stickerData);
    } else {
      // Send initial position data for new stickers
      stickerWindow.webContents.send('sticker-data', {
        id: stickerId,
        content: '',
        position: { x, y },
        size: { width: 250, height: windowHeight }
      });
    }
  });
  
  // Handle sticker window close
  stickerWindow.on('closed', () => {
    stickerWindows.delete(stickerId);
  });
  
  return stickerId;
}

// When Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  
  // Load saved stickers from file
  loadSavedStickers();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Load stickers from file and create sticker windows
async function loadSavedStickers() {
  try {
    if (fs.existsSync(stickersFilePath)) {
      const data = await fs.promises.readFile(stickersFilePath, 'utf8');
      const stickers = JSON.parse(data);
      
      // Create a window for each saved sticker
      stickers.forEach(sticker => {
        createStickerWindow(sticker);
      });
    }
  } catch (error) {
    console.error('Error loading stickers:', error);
  }
}

// Make sure we properly clean up before quitting
app.on('before-quit', () => {
  app.isQuitting = true;
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    // On Windows and Linux, quitting all windows should quit the app
    app.quit();
  }
});

// IPC for saving stickers data to file system
ipcMain.handle('save-stickers', async (event, stickersData) => {
  try {
    await fs.promises.writeFile(stickersFilePath, JSON.stringify(stickersData));
    return { success: true };
  } catch (error) {
    console.error('Error saving stickers:', error);
    return { success: false, error: error.message };
  }
});

// IPC for loading stickers data from file system
ipcMain.handle('load-stickers', async () => {
  try {
    if (fs.existsSync(stickersFilePath)) {
      const data = await fs.promises.readFile(stickersFilePath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error loading stickers:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// IPC for creating a new sticker
ipcMain.handle('create-sticker', async (event, stickerData) => {
  const stickerId = createStickerWindow(stickerData);
  return { success: true, id: stickerId };
});

// IPC for updating sticker position
ipcMain.handle('update-sticker', async (event, stickerData) => {
  try {
    // Get all stickers data
    let stickers = [];
    if (fs.existsSync(stickersFilePath)) {
      const data = await fs.promises.readFile(stickersFilePath, 'utf8');
      stickers = JSON.parse(data);
    }
    
    // Find and update the sticker
    const stickerIndex = stickers.findIndex(s => s.id === stickerData.id);
    if (stickerIndex !== -1) {
      stickers[stickerIndex] = stickerData;
    } else {
      stickers.push(stickerData);
    }
    
    // Save updated stickers
    await fs.promises.writeFile(stickersFilePath, JSON.stringify(stickers));
    return { success: true };
  } catch (error) {
    console.error('Error updating sticker:', error);
    return { success: false, error: error.message };
  }
});

// IPC for removing a sticker
ipcMain.handle('remove-sticker', async (event, stickerId) => {
  try {
    // Get all stickers data
    let stickers = [];
    if (fs.existsSync(stickersFilePath)) {
      const data = await fs.promises.readFile(stickersFilePath, 'utf8');
      stickers = JSON.parse(data);
    }
    
    // Remove the sticker
    const filteredStickers = stickers.filter(s => s.id !== stickerId);
    
    // Save updated stickers
    await fs.promises.writeFile(stickersFilePath, JSON.stringify(filteredStickers));
    return { success: true };
  } catch (error) {
    console.error('Error removing sticker:', error);
    return { success: false, error: error.message };
  }
});

// IPC for showing all stickers
ipcMain.handle('show-all-stickers', () => {
  stickerWindows.forEach(win => {
    if (win && !win.isDestroyed()) {
      win.show();
    }
  });
  return { success: true };
});

// IPC for hiding all stickers
ipcMain.handle('hide-all-stickers', () => {
  stickerWindows.forEach(win => {
    if (win && !win.isDestroyed()) {
      win.hide();
    }
  });
  return { success: true };
}); 