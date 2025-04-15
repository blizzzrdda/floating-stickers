/**
 * Integration test for error handling
 */

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  getFirstWindow,
  createSticker,
  countStickers
} from './helpers/electron-helper.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

test.describe('Error Handling', () => {
  let electronApp;
  let window;
  let dataPath;

  test.beforeEach(async () => {
    // Launch the Electron app
    electronApp = await launchElectronApp();

    // Get the first window
    window = await getFirstWindow(electronApp);

    // Determine the data path (this is an approximation, adjust based on actual app implementation)
    dataPath = path.join(projectRoot, 'data');
  });

  test.afterEach(async () => {
    // Close the Electron app if it was launched
    if (electronApp) {
      await electronApp.close().catch(err => console.error('Error closing Electron app:', err));
    }
  });

  test('should handle corrupted sticker data gracefully', async () => {
    // Create a sticker
    await createSticker(window, { text: 'Test Sticker' });

    // Close the app
    await electronApp.close();

    // Find the sticker data file
    // Note: This is an approximation, you'll need to adjust based on actual file location
    const dataFiles = fs.readdirSync(dataPath).filter(file => file.endsWith('.json'));

    if (dataFiles.length > 0) {
      // Corrupt the file by writing invalid JSON
      fs.writeFileSync(path.join(dataPath, dataFiles[0]), 'This is not valid JSON');

      // Restart the app
      electronApp = await launchElectronApp();
      window = await getFirstWindow(electronApp);

      // The app should start without crashing
      expect(await window.title()).toBeTruthy();

      // The app should handle the corrupted data (either by showing an error or creating a new empty state)
      // This test just verifies the app doesn't crash
    }
  });

  test('should handle missing sticker data gracefully', async () => {
    // Create a sticker
    await createSticker(window, { text: 'Test Sticker' });

    // Close the app
    await electronApp.close();

    // Find and delete the sticker data file
    // Note: This is an approximation, you'll need to adjust based on actual file location
    const dataFiles = fs.readdirSync(dataPath).filter(file => file.endsWith('.json'));

    if (dataFiles.length > 0) {
      // Delete the file
      fs.unlinkSync(path.join(dataPath, dataFiles[0]));

      // Restart the app
      electronApp = await launchElectronApp();
      window = await getFirstWindow(electronApp);

      // The app should start without crashing
      expect(await window.title()).toBeTruthy();

      // The app should handle the missing data (by creating a new empty state)
      // This test just verifies the app doesn't crash
    }
  });

  test('should handle read-only data directory gracefully', async () => {
    // Skip this test on CI environments where we might not have permission to change file attributes
    test.skip(!!process.env.CI, 'Skipping in CI environment');

    // Create a sticker
    await createSticker(window, { text: 'Test Sticker' });

    // Close the app
    await electronApp.close();

    try {
      // Make the data directory read-only
      // Note: This is platform-specific and might not work in all environments
      if (process.platform === 'win32') {
        await new Promise((resolve, reject) => {
          const { exec } = require('child_process');
          exec(`attrib +r "${dataPath}"`, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } else {
        fs.chmodSync(dataPath, 0o444);
      }

      // Restart the app
      electronApp = await launchElectronApp();
      window = await getFirstWindow(electronApp);

      // The app should start without crashing
      expect(await window.title()).toBeTruthy();

      // Create a new sticker - this should either show an error or handle the failure gracefully
      await createSticker(window, { text: 'New Sticker' });

      // The app should not crash even if it can't save the sticker
    } finally {
      // Restore permissions
      if (process.platform === 'win32') {
        await new Promise((resolve) => {
          const { exec } = require('child_process');
          exec(`attrib -r "${dataPath}"`, () => resolve());
        });
      } else {
        fs.chmodSync(dataPath, 0o755);
      }
    }
  });

  test('should handle excessive number of stickers', async () => {
    // Create many stickers (this tests memory handling and performance degradation)
    const stickerCount = 20; // Adjust based on what's reasonable for the app

    for (let i = 0; i < stickerCount; i++) {
      await createSticker(window, { text: `Sticker ${i + 1}` });
    }

    // Verify all stickers were created
    const count = await countStickers(window);
    expect(count).toBe(stickerCount);

    // The app should remain responsive
    // Create one more sticker to verify app is still functional
    await createSticker(window, { text: 'Final Sticker' });

    // Verify the new sticker was created
    const newCount = await countStickers(window);
    expect(newCount).toBe(stickerCount + 1);
  });

  test('should handle very large sticker content', async () => {
    // Create a sticker with very large content
    const largeText = 'A'.repeat(10000); // 10KB of text

    // Create the sticker
    await createSticker(window, { text: largeText });

    // Verify the sticker was created
    const count = await countStickers(window);
    expect(count).toBe(1);

    // The app should remain responsive
    // Create another sticker to verify app is still functional
    await createSticker(window, { text: 'Second Sticker' });

    // Verify the new sticker was created
    const newCount = await countStickers(window);
    expect(newCount).toBe(2);
  });
});
