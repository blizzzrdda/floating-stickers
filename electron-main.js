const { app, BrowserWindow, Menu, ipcMain, Tray, screen, globalShortcut } = require('electron');
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
    
    // Filter stickers that are on the target display
    const stickersOnTargetDisplay = existingStickers.filter(sticker => {
      if (!sticker.position) return false;
      const stickerX = sticker.position.x;
      const stickerY = sticker.position.y;
      return stickerX >= workArea.x && stickerX < workArea.x + workArea.width &&
             stickerY >= workArea.y && stickerY < workArea.y + workArea.height;
    });
    
    // Also check current active sticker windows to ensure proper stacking
    let lowestY = workArea.y + GRID_SIZE;
    
    // First check existing stickers from file that are on this display
    if (stickersOnTargetDisplay.length > 0) {
      stickersOnTargetDisplay.forEach(sticker => {
        if (sticker.position && (sticker.size || stickerHeight)) {
          const bottom = sticker.position.y + (sticker.size?.height || stickerHeight);
          if (bottom > lowestY) {
            lowestY = bottom;
          }
        }
      });
    }
    
    // Now check active sticker windows that are on this display
    if (stickerWindows.size > 0) {
      stickerWindows.forEach(win => {
        if (win && !win.isDestroyed()) {
          const [winX, winY] = win.getPosition();
          
          // Check if this sticker is on the target display
          if (winX >= workArea.x && winX < workArea.x + workArea.width &&
              winY >= workArea.y && winY < workArea.y + workArea.height) {
            const [winWidth, winHeight] = win.getSize();
            const bottom = winY + winHeight;
            
            if (bottom > lowestY) {
              lowestY = bottom;
            }
          }
        }
      });
    }
    
    if (lowestY === workArea.y + GRID_SIZE && stickersOnTargetDisplay.length === 0 && stickerWindows.size === 0) {
      // First sticker on this display - position at top-left with padding
      x = workArea.x + GRID_SIZE;
      y = workArea.y + GRID_SIZE;
    } else {
      // Position the new sticker below the lowest one with padding
      x = workArea.x + GRID_SIZE;
      y = Math.round((lowestY + GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
    }
    
    // Ensure we're not placing stickers off-screen
    x = Math.min(x, workArea.x + workArea.width - stickerWidth);
    y = Math.min(y, workArea.y + workArea.height - stickerHeight);
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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Load stickers from file and create sticker windows
async function loadSavedStickers() {
  try {
    if (fs.existsSync(stickersFilePath)) {
      const data = await fs.promises.readFile(stickersFilePath, 'utf8');
      let stickers = JSON.parse(data);
      
      // Sanitize sticker content to ensure only plain text
      stickers = stickers.map(sticker => {
        if (sticker.content && typeof sticker.content === 'string') {
          // Strip HTML tags to get plain text
          sticker.content = stripHtml(sticker.content);
        }
        return sticker;
      });
      
      // Save the sanitized stickers back to file
      await fs.promises.writeFile(stickersFilePath, JSON.stringify(stickers));
      
      // Create a window for each saved sticker
      stickers.forEach(sticker => {
        createStickerWindow(sticker);
      });
    }
  } catch (error) {
    console.error('Error loading stickers:', error);
  }
}

// Function to strip HTML tags from content
function stripHtml(html) {
  if (!html) return '';
  // Create a temporary DOM element
  const tempElement = new (require('jsdom').JSDOM)('').window.document.createElement('div');
  tempElement.innerHTML = html;
  return tempElement.textContent || tempElement.innerText || '';
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

// Make sure we properly clean up before quitting
app.on('before-quit', () => {
  app.isQuitting = true;
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
  const GRID_SIZE = 20;
  
  // Get all available displays
  const displays = screen.getAllDisplays();
  
  // Get all sticker windows
  const validStickers = [];
  stickerWindows.forEach(win => {
    if (win && !win.isDestroyed()) {
      validStickers.push(win);
    }
  });
  
  // Group stickers by the display they're currently on
  const stickersByDisplay = {};
  
  validStickers.forEach(win => {
    const [winX, winY] = win.getPosition();
    
    // Determine which display this sticker is on
    let targetDisplay = null;
    for (const display of displays) {
      const bounds = display.bounds;
      if (winX >= bounds.x && winX < bounds.x + bounds.width &&
          winY >= bounds.y && winY < bounds.y + bounds.height) {
        targetDisplay = display;
        break;
      }
    }
    
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
  
  // Process each display separately
  displays.forEach(display => {
    const displayId = display.id;
    const stickersOnDisplay = stickersByDisplay[displayId] || [];
    
    if (stickersOnDisplay.length === 0) return;
    
    // Get display work area (accounts for taskbar, etc.)
    const workArea = screen.getDisplayMatching(display.bounds).workArea;
    const maxHeight = workArea.height - 100; // Leave some space at the bottom
    
    // Sort stickers on this display by their vertical position (top to bottom)
    stickersOnDisplay.sort((a, b) => {
      const [aX, aY] = a.getPosition();
      const [bX, bY] = b.getPosition();
      return aY - bY;
    });
    
    // Get the horizontal position of the first (topmost) sticker
    const [firstStickerX, firstStickerY] = stickersOnDisplay[0].getPosition();
    
    // Use the horizontal position of the first sticker as the alignment point
    let baseX = firstStickerX;
    let currentY = workArea.y + GRID_SIZE;
    let maxWidthInColumn = 0;
    
    // Position each sticker on this display
    stickersOnDisplay.forEach((win, index) => {
      // Get the size of the current sticker
      const [winWidth, winHeight] = win.getSize();
      
      // If adding this sticker would exceed the screen height, move to the next column
      if (currentY + winHeight > workArea.y + maxHeight && index > 0) {
        // Move to the next column, but maintain the same horizontal alignment as the first sticker
        baseX += maxWidthInColumn + GRID_SIZE;
        currentY = workArea.y + GRID_SIZE;
        maxWidthInColumn = 0;
      }
      
      // Set position - use the same x-coordinate as the first sticker (or offset for additional columns)
      win.setPosition(baseX, currentY);
      
      // Update the maximum width in the current column
      maxWidthInColumn = Math.max(maxWidthInColumn, winWidth);
      
      // Move down for the next sticker
      currentY += winHeight + GRID_SIZE;
    });
  });
} 