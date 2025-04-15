/**
 * Integration test for editing sticker content
 */

import { test, expect } from '@playwright/test';
import {
  launchElectronApp,
  getFirstWindow,
  createSticker,
  editStickerContent,
  getStickerContent
} from './helpers/electron-helper.js';

test.describe('Edit Sticker Content', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch the Electron app
    electronApp = await launchElectronApp();

    // Get the first window
    window = await getFirstWindow(electronApp);

    // Create a sticker for testing
    await createSticker(window, { text: 'Initial content' });
  });

  test.afterEach(async () => {
    // Close the Electron app if it was launched
    if (electronApp) {
      await electronApp.close().catch(err => console.error('Error closing Electron app:', err));
    }
  });

  test('should edit sticker content', async () => {
    // Edit the sticker content
    const newText = 'Updated content';
    await editStickerContent(window, '.sticker', newText);

    // Verify the content was updated
    const content = await getStickerContent(window, '.sticker');
    expect(content).toBe(newText);
  });

  test('should edit sticker content multiple times', async () => {
    // First edit
    await editStickerContent(window, '.sticker', 'First update');
    let content = await getStickerContent(window, '.sticker');
    expect(content).toBe('First update');

    // Second edit
    await editStickerContent(window, '.sticker', 'Second update');
    content = await getStickerContent(window, '.sticker');
    expect(content).toBe('Second update');

    // Third edit
    await editStickerContent(window, '.sticker', 'Third update');
    content = await getStickerContent(window, '.sticker');
    expect(content).toBe('Third update');
  });

  test('should handle empty content when editing', async () => {
    // Edit to empty content
    await editStickerContent(window, '.sticker', '');

    // Verify the content is empty
    const content = await getStickerContent(window, '.sticker');
    expect(content).toBe('');
  });

  test('should handle long text content', async () => {
    // Create long text
    const longText = 'This is a very long text content that should be handled properly by the sticker component. ' +
      'It should wrap and display correctly without any issues. We want to make sure that the sticker can handle ' +
      'paragraphs and long content without breaking the layout or causing any visual problems.';

    // Edit with long text
    await editStickerContent(window, '.sticker', longText);

    // Verify the content was updated correctly
    const content = await getStickerContent(window, '.sticker');
    expect(content).toBe(longText);
  });

  test('should persist content after clicking outside', async () => {
    // Edit the sticker
    const newText = 'Content to persist';
    await editStickerContent(window, '.sticker', newText);

    // Click elsewhere on the page
    await window.click('body', { position: { x: 10, y: 10 } });

    // Click again somewhere else
    await window.click('body', { position: { x: 50, y: 50 } });

    // Verify the content is still there
    const content = await getStickerContent(window, '.sticker');
    expect(content).toBe(newText);
  });

  test('should handle multiline content', async () => {
    // Create multiline text
    const multilineText = 'Line 1\nLine 2\nLine 3';

    // Edit with multiline text
    await window.dblclick('.sticker .sticker-content');
    await window.keyboard.press('Control+A');
    await window.keyboard.press('Delete');
    await window.keyboard.type('Line 1');
    await window.keyboard.press('Enter');
    await window.keyboard.type('Line 2');
    await window.keyboard.press('Enter');
    await window.keyboard.type('Line 3');
    await window.click('body', { position: { x: 10, y: 10 } });

    // Get the HTML content to check for line breaks
    const htmlContent = await window.$eval('.sticker .sticker-content', el => el.innerHTML);

    // Verify the content has line breaks (either <br> tags or newlines)
    expect(htmlContent).toMatch(/Line 1.*Line 2.*Line 3/s);
  });
});
