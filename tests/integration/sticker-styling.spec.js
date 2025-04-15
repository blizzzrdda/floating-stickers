/**
 * Integration test for sticker styling and appearance
 */

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  getFirstWindow,
  createSticker,
  changeStickerColor,
  getStickerColor
} from './helpers/electron-helper.js';

test.describe('Sticker Styling and Appearance', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch the Electron app
    electronApp = await launchElectronApp();

    // Get the first window
    window = await getFirstWindow(electronApp);

    // Create a sticker for testing
    await createSticker(window, { text: 'Style Test' });
  });

  test.afterEach(async () => {
    // Close the Electron app if it was launched
    if (electronApp) {
      await electronApp.close().catch(err => console.error('Error closing Electron app:', err));
    }
  });

  test('should change sticker color', async () => {
    // Get initial color
    const initialColor = await getStickerColor(window, '.sticker');

    // Change color to yellow
    await changeStickerColor(window, '.sticker', 'Yellow');

    // Get new color
    const newColor = await getStickerColor(window, '.sticker');

    // Verify color changed
    expect(newColor).not.toBe(initialColor);
  });

  test('should cycle through multiple colors', async () => {
    // Get initial color
    const initialColor = await getStickerColor(window, '.sticker');

    // Change to yellow
    await changeStickerColor(window, '.sticker', 'Yellow');
    const yellowColor = await getStickerColor(window, '.sticker');
    expect(yellowColor).not.toBe(initialColor);

    // Change to blue
    await changeStickerColor(window, '.sticker', 'Blue');
    const blueColor = await getStickerColor(window, '.sticker');
    expect(blueColor).not.toBe(yellowColor);
    expect(blueColor).not.toBe(initialColor);

    // Change to green
    await changeStickerColor(window, '.sticker', 'Green');
    const greenColor = await getStickerColor(window, '.sticker');
    expect(greenColor).not.toBe(blueColor);
    expect(greenColor).not.toBe(yellowColor);
    expect(greenColor).not.toBe(initialColor);
  });

  test('should persist color after app restart', async () => {
    // Change color to blue
    await changeStickerColor(window, '.sticker', 'Blue');

    // Get the blue color
    const blueColor = await getStickerColor(window, '.sticker');

    // Close the app
    await electronApp.close();

    // Restart the app
    electronApp = await launchElectronApp();
    window = await getFirstWindow(electronApp);

    // Wait for stickers to load
    await window.waitForSelector('.sticker');

    // Get color after restart
    const newColor = await getStickerColor(window, '.sticker');

    // Verify color persisted
    expect(newColor).toBe(blueColor);
  });

  test('should have proper sticker appearance', async () => {
    // Check if sticker has expected CSS properties
    const hasExpectedStyles = await window.evaluate(() => {
      const sticker = document.querySelector('.sticker');
      const styles = window.getComputedStyle(sticker);

      // Check for basic styling properties
      return {
        hasBorderRadius: parseInt(styles.borderRadius) > 0,
        hasShadow: styles.boxShadow !== 'none',
        hasMinWidth: parseInt(styles.minWidth) > 0,
        hasMinHeight: parseInt(styles.minHeight) > 0,
        isPositionAbsolute: styles.position === 'absolute',
        hasZIndex: parseInt(styles.zIndex) > 0
      };
    });

    // Verify sticker has expected styling
    expect(hasExpectedStyles.hasBorderRadius).toBe(true);
    expect(hasExpectedStyles.hasShadow).toBe(true);
    expect(hasExpectedStyles.hasMinWidth).toBe(true);
    expect(hasExpectedStyles.hasMinHeight).toBe(true);
    expect(hasExpectedStyles.isPositionAbsolute).toBe(true);
    expect(hasExpectedStyles.hasZIndex).toBe(true);
  });

  test('should have proper content styling', async () => {
    // Check if sticker content has expected CSS properties
    const hasExpectedContentStyles = await window.evaluate(() => {
      const content = document.querySelector('.sticker .sticker-content');
      const styles = window.getComputedStyle(content);

      return {
        hasPadding: parseInt(styles.padding) > 0,
        isContentEditable: content.contentEditable === 'true' || content.contentEditable === 'inherit',
        hasOverflowProperty: styles.overflow !== 'visible',
        hasWordWrap: styles.wordWrap === 'break-word' || styles.overflowWrap === 'break-word'
      };
    });

    // Verify content has expected styling
    expect(hasExpectedContentStyles.hasPadding).toBe(true);
    expect(hasExpectedContentStyles.isContentEditable).toBe(true);
    expect(hasExpectedContentStyles.hasOverflowProperty).toBe(true);
    expect(hasExpectedContentStyles.hasWordWrap).toBe(true);
  });

  test('should show focus styles when editing', async () => {
    // Double-click to edit
    await window.dblclick('.sticker .sticker-content');

    // Check if sticker content has focus styles
    const hasFocusStyles = await window.evaluate(() => {
      const content = document.querySelector('.sticker .sticker-content');
      const styles = window.getComputedStyle(content);

      // Check if element has focus
      return {
        hasFocus: document.activeElement === content,
        hasOutline: styles.outline !== 'none' || styles.boxShadow !== 'none'
      };
    });

    // Verify focus styles
    expect(hasFocusStyles.hasFocus).toBe(true);
    expect(hasFocusStyles.hasOutline).toBe(true);
  });
});
