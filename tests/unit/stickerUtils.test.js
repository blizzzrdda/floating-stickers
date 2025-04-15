import fs from 'fs';
import path from 'path';
import os from 'os';
import StickerDataManager from '../../utils/stickerUtils.js';

describe('StickerDataManager', () => {
  // Create a temporary test directory
  let testDir;
  let stickerManager;
  
  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sticker-test-'));
    stickerManager = new StickerDataManager(testDir);
  });
  
  afterEach(() => {
    // Clean up test files after each test
    try {
      if (fs.existsSync(testDir)) {
        const files = fs.readdirSync(testDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testDir, file));
        }
        fs.rmdirSync(testDir);
      }
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  });
  
  test('constructor initializes with correct file paths', () => {
    expect(stickerManager.userDataPath).toBe(testDir);
    expect(stickerManager.layoutFilePath).toBe(path.join(testDir, 'stickers-layout.json'));
    expect(stickerManager.contentFilePath).toBe(path.join(testDir, 'stickers-content.json'));
  });
  
  test('loadLayoutData returns empty array for non-existent file', async () => {
    const result = await stickerManager.loadLayoutData();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
  
  test('loadContentData returns empty array for non-existent file', async () => {
    const result = await stickerManager.loadContentData();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
  
  test('saveLayoutData saves valid layout data', async () => {
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      }
    ];
    
    const result = await stickerManager.saveLayoutData(layoutData);
    expect(result).toBe(true);
    
    // Verify file was created
    expect(fs.existsSync(stickerManager.layoutFilePath)).toBe(true);
    
    // Verify content
    const savedData = await stickerManager.loadLayoutData();
    expect(savedData).toEqual(layoutData);
  });
  
  test('saveContentData saves valid content data', async () => {
    const contentData = [
      {
        id: '1',
        content: 'Test content'
      }
    ];
    
    const result = await stickerManager.saveContentData(contentData);
    expect(result).toBe(true);
    
    // Verify file was created
    expect(fs.existsSync(stickerManager.contentFilePath)).toBe(true);
    
    // Verify content
    const savedData = await stickerManager.loadContentData();
    expect(savedData).toEqual(contentData);
  });
  
  test('loadStickerData returns empty array when no files exist', async () => {
    const result = await stickerManager.loadStickerData();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
  
  test('loadStickerData correctly merges layout and content data', async () => {
    // Create test data
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      },
      {
        id: '2',
        position: { x: 300, y: 400 },
        size: { width: 300, height: 100 }
      }
    ];
    
    const contentData = [
      {
        id: '1',
        content: 'Content for sticker 1'
      },
      {
        id: '2',
        content: 'Content for sticker 2'
      }
    ];
    
    // Save test data
    await stickerManager.saveLayoutData(layoutData);
    await stickerManager.saveContentData(contentData);
    
    // Load merged data
    const mergedData = await stickerManager.loadStickerData();
    
    // Verify merged data
    expect(Array.isArray(mergedData)).toBe(true);
    expect(mergedData.length).toBe(2);
    
    // Check first sticker
    expect(mergedData[0].id).toBe('1');
    expect(mergedData[0].content).toBe('Content for sticker 1');
    expect(mergedData[0].position).toEqual({ x: 100, y: 200 });
    expect(mergedData[0].size).toEqual({ width: 250, height: 80 });
    
    // Check second sticker
    expect(mergedData[1].id).toBe('2');
    expect(mergedData[1].content).toBe('Content for sticker 2');
    expect(mergedData[1].position).toEqual({ x: 300, y: 400 });
    expect(mergedData[1].size).toEqual({ width: 300, height: 100 });
  });
  
  test('loadStickerData handles missing content for a layout', async () => {
    // Create test data with layout but no matching content
    const layoutData = [
      {
        id: '1',
        position: { x: 100, y: 200 },
        size: { width: 250, height: 80 }
      }
    ];
    
    const contentData = [
      {
        id: '2', // Different ID
        content: 'Content for sticker 2'
      }
    ];
    
    // Save test data
    await stickerManager.saveLayoutData(layoutData);
    await stickerManager.saveContentData(contentData);
    
    // Load merged data
    const mergedData = await stickerManager.loadStickerData();
    
    // Verify merged data
    expect(Array.isArray(mergedData)).toBe(true);
    expect(mergedData.length).toBe(1);
    
    // Check sticker has empty content
    expect(mergedData[0].id).toBe('1');
    expect(mergedData[0].content).toBe('');
    expect(mergedData[0].position).toEqual({ x: 100, y: 200 });
    expect(mergedData[0].size).toEqual({ width: 250, height: 80 });
  });
  
  test('updateSticker creates new sticker data if it doesn\'t exist', async () => {
    const stickerData = {
      id: 'new-sticker',
      content: 'New sticker content',
      position: { x: 100, y: 200 },
      size: { width: 250, height: 80 }
    };
    
    const result = await stickerManager.updateSticker(stickerData);
    
    expect(result.success).toBe(true);
    
    // Verify sticker was saved
    const mergedData = await stickerManager.loadStickerData();
    expect(mergedData.length).toBe(1);
    expect(mergedData[0].id).toBe('new-sticker');
    expect(mergedData[0].content).toBe('New sticker content');
  });
  
  test('updateSticker updates existing sticker data', async () => {
    // Create initial sticker
    const initialData = {
      id: 'test-sticker',
      content: 'Initial content',
      position: { x: 100, y: 200 },
      size: { width: 250, height: 80 }
    };
    
    await stickerManager.updateSticker(initialData);
    
    // Update the sticker
    const updatedData = {
      id: 'test-sticker',
      content: 'Updated content',
      position: { x: 300, y: 400 },
      size: { width: 300, height: 100 }
    };
    
    const result = await stickerManager.updateSticker(updatedData);
    
    expect(result.success).toBe(true);
    
    // Verify sticker was updated
    const mergedData = await stickerManager.loadStickerData();
    expect(mergedData.length).toBe(1);
    expect(mergedData[0].id).toBe('test-sticker');
    expect(mergedData[0].content).toBe('Updated content');
    expect(mergedData[0].position).toEqual({ x: 300, y: 400 });
    expect(mergedData[0].size).toEqual({ width: 300, height: 100 });
  });
  
  test('removeSticker removes sticker data', async () => {
    // Create stickers
    const sticker1 = {
      id: 'sticker1',
      content: 'Sticker 1 content',
      position: { x: 100, y: 200 },
      size: { width: 250, height: 80 }
    };
    
    const sticker2 = {
      id: 'sticker2',
      content: 'Sticker 2 content',
      position: { x: 300, y: 400 },
      size: { width: 300, height: 100 }
    };
    
    await stickerManager.updateSticker(sticker1);
    await stickerManager.updateSticker(sticker2);
    
    // Verify both stickers were saved
    let mergedData = await stickerManager.loadStickerData();
    expect(mergedData.length).toBe(2);
    
    // Remove sticker1
    const result = await stickerManager.removeSticker('sticker1');
    
    expect(result.success).toBe(true);
    
    // Verify sticker1 was removed
    mergedData = await stickerManager.loadStickerData();
    expect(mergedData.length).toBe(1);
    expect(mergedData[0].id).toBe('sticker2');
  });
  
  test('stripHtml removes HTML tags from content', async () => {
    const htmlContent = '<div>Test <b>content</b> with <i>HTML</i> tags</div>';
    const plainText = await stickerManager.stripHtml(htmlContent);
    
    expect(plainText).toBe('Test content with HTML tags');
  });
  
  test('sanitizeContent calls stripHtml', async () => {
    const htmlContent = '<div>Test <b>content</b></div>';
    const plainText = await stickerManager.sanitizeContent(htmlContent);
    
    expect(plainText).toBe('Test content');
  });
});
