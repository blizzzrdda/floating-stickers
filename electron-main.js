const { app, BrowserWindow, Menu, ipcMain, Tray, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const StickerDataManager = require('./utils/stickerUtils');

// Define the user data path
const userDataPath = app.getPath('userData');

// Define the stickers file path
const stickersFilePath = path.join(userDataPath, 'stickers.json');

// Initialize the sticker data manager
const stickerManager = new StickerDataManager(userDataPath);

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
    
    // Send the data to the sticker window
    stickerWindow.webContents.send('sticker-data', dataToSend);
    
    // Show the window
    stickerWindow.show();
    
    // Auto-align stickers if this is a new sticker (not being restored from saved data)
    if (!stickerData || !stickerData.id) {
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
    
    // We'll let the renderer process update this in the file
    stickerWindow.webContents.send('position-updated', updatedPosition);
  });
  
  // Return the ID we assigned to this sticker
  return stickerId;
}

// When Electron has finished initialization
app.whenReady().then(async () => {
  createWindow();
  
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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Load stickers from file and create sticker windows
async function loadSavedStickers() {
  try {
    // First, migrate from old format if needed
    await stickerManager.migrateFromLegacyFormat();
    
    // Load the merged sticker data
    const stickers = await stickerManager.loadStickerData();
    
    // Create windows for each sticker
    for (const sticker of stickers) {
      // Create the sticker window
      createStickerWindow(sticker);
    }
  } catch (error) {
    console.error('Error loading stickers:', error);
  }
}

// Function to strip HTML tags from content
function stripHtml(html) {
  return stickerManager.stripHtml(html);
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
ipcMain.handle('create-sticker', async (event, stickerData) => {
  const stickerId = createStickerWindow(stickerData);
  return { success: true, id: stickerId };
});

// IPC for updating sticker position
ipcMain.handle('update-sticker', async (event, stickerData) => {
  try {
    // Use the sticker manager to update the sticker
    const result = await stickerManager.updateSticker(stickerData);
    return result;
  } catch (error) {
    console.error('Error updating sticker:', error);
    return { success: false, error: error.message };
  }
});

// IPC for removing a sticker
ipcMain.handle('remove-sticker', async (event, stickerId) => {
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
  const GRID_SIZE = 20;
  const BOTTOM_MARGIN = 200; // Space to leave at the bottom of the screen
  
  // Get all available displays
  const displays = screen.getAllDisplays();
  
  // Collect valid sticker windows
  const validStickers = Array.from(stickerWindows.values()).filter(win => 
    win && !win.isDestroyed()
  );
  
  if (validStickers.length === 0) return; // No stickers to align
  
  // Group stickers by the display they're currently on
  const stickersByDisplay = groupStickersByDisplay(validStickers, displays);
  
  // Process and align stickers on each display
  displays.forEach(display => {
    alignStickersOnDisplay(display, stickersByDisplay[display.id] || [], GRID_SIZE, BOTTOM_MARGIN);
  });
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
  
  // Get display work area (accounts for taskbar, etc.)
  const workArea = screen.getDisplayMatching(display.bounds).workArea;
  const maxHeight = workArea.height - bottomMargin;
  
  // Sort stickers by their vertical position (top to bottom)
  stickers.sort((a, b) => {
    const [, aY] = a.getPosition();
    const [, bY] = b.getPosition();
    return aY - bY;
  });
  
  // Use the horizontal position of the first sticker as the alignment point
  const [firstStickerX] = stickers[0].getPosition();
  
  let baseX = firstStickerX;
  let currentY = workArea.y + gridSize;
  let maxWidthInColumn = 0;
  
  // Position each sticker
  stickers.forEach((win, index) => {
    const [winWidth, winHeight] = win.getSize();
    
    // Start a new column if this sticker would exceed screen height
    if (currentY + winHeight > workArea.y + maxHeight && index > 0) {
      baseX += maxWidthInColumn + gridSize;
      currentY = workArea.y + gridSize;
      maxWidthInColumn = 0;
    }
    
    // Position the sticker
    win.setPosition(baseX, currentY);
    
    // Update tracking variables
    maxWidthInColumn = Math.max(maxWidthInColumn, winWidth);
    currentY += winHeight + gridSize;
  });
} 