/**
 * Integration test for sticker persistence
 */

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  getFirstWindow,
  createSticker,
  getStickerContent,
  countStickers,
  editStickerContent
} from './helpers/electron-helper.js';

test.describe('Sticker Persistence', () => {
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

  test('should persist stickers after app restart', async () => {
    // Create stickers with unique content
    await createSticker(window, { text: 'Persistent Sticker 1' });
    await createSticker(window, { text: 'Persistent Sticker 2' });

    // Verify we have 2 stickers
    const initialCount = await countStickers(window);
    expect(initialCount).toBe(2);

    // Close the app
    await electronApp.close();

    // Restart the app
    electronApp = await launchElectronApp();
    window = await getFirstWindow(electronApp);

    // Wait for stickers to load
    await window.waitForSelector('.sticker');

    // Verify we still have 2 stickers
    const newCount = await countStickers(window);
    expect(newCount).toBe(2);

    // Verify the content of the stickers
    const stickers = await window.$$('.sticker');
    const contents = [];

    for (const sticker of stickers) {
      const content = await sticker.$eval('.sticker-content', el => el.textContent);
      contents.push(content);
    }

    // Verify both stickers are present with correct content
    expect(contents).toContain('Persistent Sticker 1');
    expect(contents).toContain('Persistent Sticker 2');
  });

  test('should persist sticker position and size after app restart', async () => {
    // Create a sticker
    await createSticker(window, { text: 'Position Test' });

    // Move and resize the sticker
    const sticker = await window.$('.sticker');
    const box = await sticker.boundingBox();

    // Move sticker
    await window.mouse.move(box.x + box.width / 2, box.y + 10);
    await window.mouse.down();
    await window.mouse.move(box.x + box.width / 2 + 100, box.y + 10 + 100);
    await window.mouse.up();

    // Resize sticker
    await window.mouse.move(box.x + box.width, box.y + box.height);
    await window.mouse.down();
    await window.mouse.move(box.x + box.width + 50, box.y + box.height + 50);
    await window.mouse.up();

    // Get position and size after modifications
    const modifiedBox = await sticker.boundingBox();

    // Close the app
    await electronApp.close();

    // Restart the app
    electronApp = await launchElectronApp();
    window = await getFirstWindow(electronApp);

    // Wait for stickers to load
    await window.waitForSelector('.sticker');

    // Get the sticker's position and size after restart
    const newSticker = await window.$('.sticker');
    const newBox = await newSticker.boundingBox();

    // Verify position and size are approximately the same
    // Allow for some margin of error due to window positioning differences
    expect(Math.abs(newBox.width - modifiedBox.width)).toBeLessThan(20);
    expect(Math.abs(newBox.height - modifiedBox.height)).toBeLessThan(20);
  });

  test('should persist sticker content changes', async () => {
    // Create a sticker
    await createSticker(window, { text: 'Original Content' });

    // Edit the sticker content
    await editStickerContent(window, '.sticker', 'Modified Content');

    // Verify the content was updated
    let content = await getStickerContent(window, '.sticker');
    expect(content).toBe('Modified Content');

    // Close the app
    await electronApp.close();

    // Restart the app
    electronApp = await launchElectronApp();
    window = await getFirstWindow(electronApp);

    // Wait for stickers to load
    await window.waitForSelector('.sticker');

    // Verify the content is still the modified version
    content = await getStickerContent(window, '.sticker');
    expect(content).toBe('Modified Content');
  });

  test('should persist multiple stickers with different properties', async () => {
    // Create stickers with different content
    await createSticker(window, { text: 'Sticker A' });
    await createSticker(window, { text: 'Sticker B' });
    await createSticker(window, { text: 'Sticker C' });

    // Modify the stickers
    const stickers = await window.$$('.sticker');

    // Edit content of the second sticker
    await editStickerContent(window, '.sticker:nth-child(2)', 'Modified Sticker B');

    // Close the app
    await electronApp.close();

    // Restart the app
    electronApp = await launchElectronApp();
    window = await getFirstWindow(electronApp);

    // Wait for stickers to load
    await window.waitForSelector('.sticker');

    // Verify we have 3 stickers
    const count = await countStickers(window);
    expect(count).toBe(3);

    // Get all sticker contents
    const newStickers = await window.$$('.sticker');
    const contents = [];

    for (const sticker of newStickers) {
      const content = await sticker.$eval('.sticker-content', el => el.textContent);
      contents.push(content);
    }

    // Verify all stickers are present with correct content
    expect(contents).toContain('Sticker A');
    expect(contents).toContain('Modified Sticker B');
    expect(contents).toContain('Sticker C');
  });
});
