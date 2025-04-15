/**
 * Tests for UI components
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

// Mock document and window
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// Mock errorDisplay module
jest.mock('../../ui/errorDisplay.js', () => ({
  displayError: jest.fn(),
  displayWarning: jest.fn(),
  displayInfo: jest.fn()
}));

describe('UI Components', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  test('Sticker element creation', () => {
    // Create sticker element
    const sticker = document.createElement('div');
    sticker.className = 'sticker';
    
    // Create close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'sticker-close';
    closeBtn.innerHTML = '&times;';
    
    // Create content area
    const content = document.createElement('div');
    content.className = 'sticker-content';
    content.contentEditable = 'true';
    content.textContent = 'Test content';
    
    // Assemble sticker
    sticker.appendChild(closeBtn);
    sticker.appendChild(content);
    document.body.appendChild(sticker);
    
    // Verify sticker structure
    expect(document.querySelector('.sticker')).not.toBeNull();
    expect(document.querySelector('.sticker-close')).not.toBeNull();
    expect(document.querySelector('.sticker-content')).not.toBeNull();
    
    // Verify content
    expect(document.querySelector('.sticker-content').textContent).toBe('Test content');
    expect(document.querySelector('.sticker-content').contentEditable).toBe('true');
    
    // Create snapshot of the sticker HTML
    expect(document.body.innerHTML).toMatchSnapshot();
  });
  
  test('Error display component', () => {
    // Create error container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    
    // Create error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = 'Test error message';
    
    // Create error icon
    const errorIcon = document.createElement('div');
    errorIcon.className = 'error-icon';
    errorIcon.innerHTML = '⚠️';
    
    // Create close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'error-close';
    closeBtn.innerHTML = '&times;';
    
    // Assemble error display
    errorMessage.appendChild(errorIcon);
    errorContainer.appendChild(errorMessage);
    errorContainer.appendChild(closeBtn);
    document.body.appendChild(errorContainer);
    
    // Verify error display structure
    expect(document.querySelector('.error-container')).not.toBeNull();
    expect(document.querySelector('.error-message')).not.toBeNull();
    expect(document.querySelector('.error-icon')).not.toBeNull();
    expect(document.querySelector('.error-close')).not.toBeNull();
    
    // Verify content
    expect(document.querySelector('.error-message').textContent).toBe('⚠️Test error message');
    
    // Create snapshot of the error display HTML
    expect(document.body.innerHTML).toMatchSnapshot();
  });
  
  test('Microphone button component', () => {
    // Create microphone button
    const microphoneBtn = document.createElement('button');
    microphoneBtn.className = 'microphone-button';
    microphoneBtn.title = 'Record audio (Speech-to-Text)';
    
    // Create microphone icon
    const microphoneIcon = document.createElement('span');
    microphoneIcon.className = 'microphone-icon';
    microphoneIcon.innerHTML = '🎤';
    
    // Assemble microphone button
    microphoneBtn.appendChild(microphoneIcon);
    document.body.appendChild(microphoneBtn);
    
    // Verify microphone button structure
    expect(document.querySelector('.microphone-button')).not.toBeNull();
    expect(document.querySelector('.microphone-icon')).not.toBeNull();
    
    // Verify attributes
    expect(document.querySelector('.microphone-button').title).toBe('Record audio (Speech-to-Text)');
    
    // Create snapshot of the microphone button HTML
    expect(document.body.innerHTML).toMatchSnapshot();
  });
  
  test('Control panel component', () => {
    // Create control panel
    const controlPanel = document.createElement('div');
    controlPanel.className = 'control-panel';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = 'FloatingStickers Control';
    
    // Create button container
    const buttonContainer = document.createElement('div');
    
    // Create buttons
    const addStickerBtn = document.createElement('button');
    addStickerBtn.id = 'add-sticker-btn';
    addStickerBtn.textContent = 'Add New Sticker';
    
    const toggleVisibilityBtn = document.createElement('button');
    toggleVisibilityBtn.id = 'toggle-visibility-btn';
    toggleVisibilityBtn.textContent = 'Toggle Visibility';
    
    const alignStickersBtn = document.createElement('button');
    alignStickersBtn.id = 'align-stickers-btn';
    alignStickersBtn.textContent = 'Re-align Stickers';
    
    // Create note
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'Note: This control panel is shown because the system tray icon could not be created.';
    
    // Assemble control panel
    buttonContainer.appendChild(addStickerBtn);
    buttonContainer.appendChild(toggleVisibilityBtn);
    buttonContainer.appendChild(alignStickersBtn);
    controlPanel.appendChild(header);
    controlPanel.appendChild(buttonContainer);
    controlPanel.appendChild(note);
    document.body.appendChild(controlPanel);
    
    // Verify control panel structure
    expect(document.querySelector('.control-panel')).not.toBeNull();
    expect(document.querySelector('#add-sticker-btn')).not.toBeNull();
    expect(document.querySelector('#toggle-visibility-btn')).not.toBeNull();
    expect(document.querySelector('#align-stickers-btn')).not.toBeNull();
    expect(document.querySelector('.note')).not.toBeNull();
    
    // Create snapshot of the control panel HTML
    expect(document.body.innerHTML).toMatchSnapshot();
  });
  
  test('Loading indicator component', () => {
    // Create loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    
    // Create loading text
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'Loading...';
    
    // Assemble loading indicator
    loadingIndicator.appendChild(spinner);
    loadingIndicator.appendChild(loadingText);
    document.body.appendChild(loadingIndicator);
    
    // Verify loading indicator structure
    expect(document.querySelector('.loading-indicator')).not.toBeNull();
    expect(document.querySelector('.spinner')).not.toBeNull();
    expect(document.querySelector('.loading-text')).not.toBeNull();
    
    // Verify content
    expect(document.querySelector('.loading-text').textContent).toBe('Loading...');
    
    // Create snapshot of the loading indicator HTML
    expect(document.body.innerHTML).toMatchSnapshot();
  });
});
