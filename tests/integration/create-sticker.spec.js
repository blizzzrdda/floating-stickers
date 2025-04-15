/**
 * Integration test for creating a sticker
 */

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  getFirstWindow,
  createSticker,
  getStickerContent,
  countStickers,
  deleteSticker
} from './helpers/electron-helper.js';

test.describe('Create Sticker', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch the Electron app
    electronApp = await launchElectronApp();

    // Get the first window
    window = await getFirstWindow(electronApp);
  });

  test.afterEach(async () => {
    // Close the Electron app if it was launched
    if (electronApp) {
      await electronApp.close().catch(err => console.error('Error closing Electron app:', err));
    }
  });

  test('should create a new sticker with text content', async () => {
    // Create a new sticker with text
    const stickerText = 'Test Sticker Content';
    await createSticker(window, { text: stickerText });

    // Wait for the sticker to be created
    await window.waitForSelector('.sticker');

    // Get the sticker content
    const content = await getStickerContent(window, '.sticker');

    // Verify the content matches what we entered
    expect(content).toBe(stickerText);

    // Verify that we have 1 sticker
    const count = await countStickers(window);
    expect(count).toBe(1);
  });

  test('should create multiple stickers', async () => {
    // Create first sticker
    await createSticker(window, { text: 'Sticker 1' });

    // Create second sticker
    await createSticker(window, { text: 'Sticker 2' });

    // Create third sticker
    await createSticker(window, { text: 'Sticker 3' });

    // Verify that we have 3 stickers
    const count = await countStickers(window);
    expect(count).toBe(3);

    // Verify the content of each sticker
    const stickers = await window.$$('.sticker');

    for (let i = 0; i < stickers.length; i++) {
      const content = await stickers[i].$eval('.sticker-content', el => el.textContent);
      expect(content).toBe(`Sticker ${i + 1}`);
    }
  });

  test('should create an empty sticker and allow editing later', async () => {
    // Create an empty sticker
    await createSticker(window);

    // Wait for the sticker to be created
    await window.waitForSelector('.sticker');

    // Verify that the sticker is empty
    const initialContent = await getStickerContent(window, '.sticker');
    expect(initialContent).toBe('');

    // Edit the sticker content
    await window.dblclick('.sticker .sticker-content');
    await window.keyboard.type('Added content later');
    await window.click('body', { position: { x: 10, y: 10 } });

    // Verify the updated content
    const updatedContent = await getStickerContent(window, '.sticker');
    expect(updatedContent).toBe('Added content later');
  });

  test('should handle special characters in sticker content', async () => {
    // Create a sticker with special characters
    const specialText = 'Special chars: !@#$%^&*()_+<>?:"{}|~`';
    await createSticker(window, { text: specialText });

    // Verify the content with special characters
    const content = await getStickerContent(window, '.sticker');
    expect(content).toBe(specialText);
  });

  test('should create and then delete a sticker', async () => {
    // Create a sticker
    await createSticker(window, { text: 'Sticker to delete' });

    // Verify we have 1 sticker
    let count = await countStickers(window);
    expect(count).toBe(1);

    // Delete the sticker
    await deleteSticker(window, '.sticker');

    // Verify the sticker was deleted
    count = await countStickers(window);
    expect(count).toBe(0);
  });
});
