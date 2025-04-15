/**
 * Integration test for sticker positioning and resizing
 */

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  getFirstWindow,
  createSticker,
  moveSticker,
  resizeSticker,
  getStickerPosition,
  getStickerSize
} from './helpers/electron-helper.js';

test.describe('Sticker Positioning and Resizing', () => {
  let electronApp;
  let window;
  let initialPosition;
  let initialSize;

  test.beforeEach(async () => {
    // Launch the Electron app
    electronApp = await launchElectronApp();

    // Get the first window
    window = await getFirstWindow(electronApp);

    // Create a sticker for testing
    await createSticker(window, { text: 'Test Sticker' });

    // Get initial position and size
    initialPosition = await getStickerPosition(window, '.sticker');
    initialSize = await getStickerSize(window, '.sticker');
  });

  test.afterEach(async () => {
    // Close the Electron app if it was launched
    if (electronApp) {
      await electronApp.close().catch(err => console.error('Error closing Electron app:', err));
    }
  });

  test('should move sticker to a new position', async () => {
    // Move the sticker
    const offset = { x: 100, y: 50 };
    await moveSticker(window, '.sticker', offset);

    // Get the new position
    const newPosition = await getStickerPosition(window, '.sticker');

    // Verify the sticker moved
    expect(newPosition.x).toBeGreaterThan(initialPosition.x);
    expect(newPosition.y).toBeGreaterThan(initialPosition.y);

    // Verify the approximate offset (allowing for some margin of error)
    expect(Math.abs(newPosition.x - initialPosition.x - offset.x)).toBeLessThan(20);
    expect(Math.abs(newPosition.y - initialPosition.y - offset.y)).toBeLessThan(20);
  });

  test('should resize sticker', async () => {
    // Resize the sticker
    const offset = { width: 50, height: 30 };
    await resizeSticker(window, '.sticker', offset);

    // Get the new size
    const newSize = await getStickerSize(window, '.sticker');

    // Verify the sticker was resized
    expect(newSize.width).toBeGreaterThan(initialSize.width);
    expect(newSize.height).toBeGreaterThan(initialSize.height);

    // Verify the approximate size change (allowing for some margin of error)
    expect(Math.abs(newSize.width - initialSize.width - offset.width)).toBeLessThan(20);
    expect(Math.abs(newSize.height - initialSize.height - offset.height)).toBeLessThan(20);
  });

  test('should move sticker to multiple positions', async () => {
    // Move right
    await moveSticker(window, '.sticker', { x: 100, y: 0 });
    let position = await getStickerPosition(window, '.sticker');
    expect(position.x).toBeGreaterThan(initialPosition.x);

    // Move down
    await moveSticker(window, '.sticker', { x: 0, y: 100 });
    position = await getStickerPosition(window, '.sticker');
    expect(position.y).toBeGreaterThan(initialPosition.y + 50);

    // Move left
    await moveSticker(window, '.sticker', { x: -100, y: 0 });
    position = await getStickerPosition(window, '.sticker');
    expect(position.x).toBeLessThan(position.x + 100);
  });

  test('should resize sticker multiple times', async () => {
    // Increase size
    await resizeSticker(window, '.sticker', { width: 50, height: 50 });
    let size = await getStickerSize(window, '.sticker');
    expect(size.width).toBeGreaterThan(initialSize.width);
    expect(size.height).toBeGreaterThan(initialSize.height);

    // Increase more
    await resizeSticker(window, '.sticker', { width: 50, height: 50 });
    size = await getStickerSize(window, '.sticker');
    expect(size.width).toBeGreaterThan(initialSize.width + 50);
    expect(size.height).toBeGreaterThan(initialSize.height + 50);

    // Decrease size
    await resizeSticker(window, '.sticker', { width: -50, height: -50 });
    size = await getStickerSize(window, '.sticker');
    expect(size.width).toBeLessThan(size.width + 50);
    expect(size.height).toBeLessThan(size.height + 50);
  });

  test('should maintain position after resizing', async () => {
    // Get initial position
    const position1 = await getStickerPosition(window, '.sticker');

    // Resize the sticker
    await resizeSticker(window, '.sticker', { width: 50, height: 50 });

    // Get position after resize
    const position2 = await getStickerPosition(window, '.sticker');

    // Verify the top-left position hasn't changed significantly
    expect(Math.abs(position1.x - position2.x)).toBeLessThan(10);
    expect(Math.abs(position1.y - position2.y)).toBeLessThan(10);
  });

  test('should maintain content after moving and resizing', async () => {
    // Move the sticker
    await moveSticker(window, '.sticker', { x: 100, y: 100 });

    // Resize the sticker
    await resizeSticker(window, '.sticker', { width: 50, height: 50 });

    // Verify the content is still there
    const content = await window.textContent('.sticker .sticker-content');
    expect(content).toBe('Test Sticker');
  });
});
