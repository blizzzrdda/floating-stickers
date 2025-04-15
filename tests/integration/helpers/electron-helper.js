/**
 * Helper functions for Electron testing with Playwright
 */

import { _electron as electron } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../');

/**
 * Launch the Electron app for testing
 * @param {Object} options - Launch options
 * @returns {Promise<import('@playwright/test').ElectronApplication>}
 */
export async function launchElectronApp(options = {}) {
  try {
    const electronApp = await electron.launch({
      executablePath: 'npx', // Use npx to run electron
      args: ['electron', path.join(projectRoot, 'electron-main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ...options.env
      },
      timeout: 30000,
      ...options
    });

    return electronApp;
  } catch (error) {
    console.error('Failed to launch Electron app:', error);
    throw error;
  }
}

/**
 * Get the first window of the Electron app
 * @param {import('@playwright/test').ElectronApplication} electronApp - Electron app instance
 * @param {Object} options - Options
 * @param {number} options.timeout - Timeout in milliseconds
 * @returns {Promise<import('@playwright/test').Page>}
 */
export async function getFirstWindow(electronApp, options = {}) {
  try {
    const window = await electronApp.firstWindow({ timeout: options.timeout || 30000 });
    // Wait a bit for the window to fully initialize
    await window.waitForTimeout(1000);
    return window;
  } catch (error) {
    console.error('Failed to get first window:', error);
    throw error;
  }
}

/**
 * Create a new sticker
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {Object} options - Sticker options
 * @param {string} options.text - Sticker text content
 * @returns {Promise<void>}
 */
export async function createSticker(window, options = {}) {
  // Click the "+" button to create a new sticker
  await window.click('#create-sticker-button');

  // If text is provided, enter it into the sticker
  if (options.text) {
    // Wait for the sticker to be created and focused
    await window.waitForSelector('.sticker-content[contenteditable="true"]:focus');

    // Type the text content
    await window.keyboard.type(options.text);

    // Click outside to save the content
    await window.click('body', { position: { x: 10, y: 10 } });
  }
}

/**
 * Edit a sticker's content
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {string} stickerSelector - Selector for the sticker
 * @param {string} newText - New text content
 * @returns {Promise<void>}
 */
export async function editStickerContent(window, stickerSelector, newText) {
  // Double-click the sticker to make it editable
  await window.dblclick(`${stickerSelector} .sticker-content`);

  // Clear existing content
  await window.keyboard.press('Control+A');
  await window.keyboard.press('Delete');

  // Type the new content
  await window.keyboard.type(newText);

  // Click outside to save the content
  await window.click('body', { position: { x: 10, y: 10 } });
}

/**
 * Delete a sticker
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {string} stickerSelector - Selector for the sticker
 * @returns {Promise<void>}
 */
export async function deleteSticker(window, stickerSelector) {
  // Right-click on the sticker to open context menu
  await window.click(`${stickerSelector}`, { button: 'right' });

  // Click the delete option
  await window.click('text=Delete');
}

/**
 * Move a sticker to a new position
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {string} stickerSelector - Selector for the sticker
 * @param {Object} offset - Position offset
 * @param {number} offset.x - X offset
 * @param {number} offset.y - Y offset
 * @returns {Promise<void>}
 */
export async function moveSticker(window, stickerSelector, offset) {
  // Get the sticker element
  const sticker = await window.$(stickerSelector);

  // Get the current position
  const box = await sticker.boundingBox();

  // Perform the drag operation
  await window.mouse.move(box.x + box.width / 2, box.y + 10);
  await window.mouse.down();
  await window.mouse.move(box.x + box.width / 2 + offset.x, box.y + 10 + offset.y);
  await window.mouse.up();
}

/**
 * Resize a sticker
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {string} stickerSelector - Selector for the sticker
 * @param {Object} offset - Size offset
 * @param {number} offset.width - Width offset
 * @param {number} offset.height - Height offset
 * @returns {Promise<void>}
 */
export async function resizeSticker(window, stickerSelector, offset) {
  // Get the sticker element
  const sticker = await window.$(stickerSelector);

  // Get the current size
  const box = await sticker.boundingBox();

  // Perform the resize operation using the bottom-right corner
  await window.mouse.move(box.x + box.width, box.y + box.height);
  await window.mouse.down();
  await window.mouse.move(box.x + box.width + offset.width, box.y + box.height + offset.height);
  await window.mouse.up();
}

/**
 * Change sticker color
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {string} stickerSelector - Selector for the sticker
 * @param {string} colorName - Color name or value
 * @returns {Promise<void>}
 */
export async function changeStickerColor(window, stickerSelector, colorName) {
  // Right-click on the sticker to open context menu
  await window.click(`${stickerSelector}`, { button: 'right' });

  // Click the color option
  await window.click('text=Color');

  // Click the specific color
  await window.click(`text=${colorName}`);
}

/**
 * Get sticker content
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {string} stickerSelector - Selector for the sticker
 * @returns {Promise<string>}
 */
export async function getStickerContent(window, stickerSelector) {
  return window.textContent(`${stickerSelector} .sticker-content`);
}

/**
 * Get sticker position
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {string} stickerSelector - Selector for the sticker
 * @returns {Promise<{x: number, y: number}>}
 */
export async function getStickerPosition(window, stickerSelector) {
  const sticker = await window.$(stickerSelector);
  const box = await sticker.boundingBox();
  return { x: box.x, y: box.y };
}

/**
 * Get sticker size
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {string} stickerSelector - Selector for the sticker
 * @returns {Promise<{width: number, height: number}>}
 */
export async function getStickerSize(window, stickerSelector) {
  const sticker = await window.$(stickerSelector);
  const box = await sticker.boundingBox();
  return { width: box.width, height: box.height };
}

/**
 * Get sticker color
 * @param {import('@playwright/test').Page} window - Electron window
 * @param {string} stickerSelector - Selector for the sticker
 * @returns {Promise<string>}
 */
export async function getStickerColor(window, stickerSelector) {
  return window.evaluate((selector) => {
    const sticker = document.querySelector(selector);
    return window.getComputedStyle(sticker).backgroundColor;
  }, stickerSelector);
}

/**
 * Wait for stickers to load
 * @param {import('@playwright/test').Page} window - Electron window
 * @returns {Promise<void>}
 */
export async function waitForStickersToLoad(window) {
  await window.waitForSelector('.sticker', { state: 'attached' });
}

/**
 * Count stickers
 * @param {import('@playwright/test').Page} window - Electron window
 * @returns {Promise<number>}
 */
export async function countStickers(window) {
  return window.evaluate(() => {
    return document.querySelectorAll('.sticker').length;
  });
}
