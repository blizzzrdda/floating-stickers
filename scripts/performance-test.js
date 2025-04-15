/**
 * Performance Test Script
 * 
 * This script tests the performance of the Sticker application
 * by creating, manipulating, and measuring various operations.
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import StickerDataManager from '../utils/stickerUtils.js';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import { globalCache } from '../utils/cacheManager.js';

// Set up paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const testDataDir = path.join(dataDir, 'test');

// Create test data directory if it doesn't exist
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Configure performance monitor
performanceMonitor.setEnabled(true);
performanceMonitor.logToConsole = true;
performanceMonitor.sampleRate = 1.0; // Log everything

// Create a test sticker data manager
const testStickerManager = new StickerDataManager({
  layoutFilePath: path.join(testDataDir, 'layout.json'),
  contentFilePath: path.join(testDataDir, 'content.json')
});

/**
 * Generate test sticker data
 * @param {number} count - Number of stickers to generate
 * @returns {Array} - Array of sticker data
 */
function generateTestStickers(count) {
  const stickers = [];
  
  for (let i = 0; i < count; i++) {
    stickers.push({
      id: `test-${i}`,
      position: {
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 600)
      },
      size: {
        width: Math.floor(Math.random() * 100) + 150,
        height: Math.floor(Math.random() * 50) + 50
      },
      content: `Test sticker ${i} with some content that might be longer for some stickers than others to simulate real-world usage patterns.`
    });
  }
  
  return stickers;
}

/**
 * Run file I/O performance tests
 * @param {number} iterations - Number of test iterations
 */
async function testFileIO(iterations = 5) {
  console.log('\n=== File I/O Performance Test ===');
  
  // Generate test data
  const testStickers = generateTestStickers(100);
  
  // Test saving
  console.log('\nTesting save performance...');
  performanceMonitor.mark('save-test-start');
  
  for (let i = 0; i < iterations; i++) {
    performanceMonitor.mark(`save-iteration-${i}-start`);
    
    // Split into layout and content
    const layoutData = testStickers.map(sticker => ({
      id: sticker.id,
      position: sticker.position,
      size: sticker.size
    }));
    
    const contentData = testStickers.map(sticker => ({
      id: sticker.id,
      content: sticker.content
    }));
    
    // Save data
    await testStickerManager.saveLayoutData(layoutData);
    await testStickerManager.saveContentData(contentData);
    
    performanceMonitor.measure(`save-iteration-${i}`, `save-iteration-${i}-start`);
  }
  
  performanceMonitor.measure('save-test-total', 'save-test-start');
  
  // Test loading
  console.log('\nTesting load performance...');
  performanceMonitor.mark('load-test-start');
  
  // First load (no cache)
  performanceMonitor.mark('load-no-cache-start');
  await testStickerManager.loadStickerData({ bypassCache: true });
  performanceMonitor.measure('load-no-cache', 'load-no-cache-start');
  
  // Subsequent loads (with cache)
  for (let i = 0; i < iterations; i++) {
    performanceMonitor.mark(`load-iteration-${i}-start`);
    await testStickerManager.loadStickerData();
    performanceMonitor.measure(`load-iteration-${i}`, `load-iteration-${i}-start`);
  }
  
  performanceMonitor.measure('load-test-total', 'load-test-start');
  
  // Print cache stats
  console.log('\nCache Statistics:');
  console.log(globalCache.getStats());
}

/**
 * Run sticker rendering performance tests
 */
async function testStickerRendering() {
  console.log('\n=== Sticker Rendering Performance Test ===');
  
  // Create a test window
  const testWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // Load a test page
  await testWindow.loadFile(path.join(projectRoot, 'test-renderer.html'));
  
  // Run rendering tests in the renderer process
  const results = await testWindow.webContents.executeJavaScript(`
    (async () => {
      // Test sticker creation
      console.time('createStickers');
      const stickers = [];
      for (let i = 0; i < 50; i++) {
        const sticker = document.createElement('div');
        sticker.className = 'sticker';
        sticker.style.position = 'absolute';
        sticker.style.left = Math.floor(Math.random() * 700) + 'px';
        sticker.style.top = Math.floor(Math.random() * 500) + 'px';
        sticker.style.width = (Math.floor(Math.random() * 100) + 150) + 'px';
        sticker.style.height = (Math.floor(Math.random() * 50) + 50) + 'px';
        sticker.style.backgroundColor = '#ffeb3b';
        sticker.style.borderRadius = '5px';
        sticker.style.boxShadow = '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)';
        sticker.style.padding = '10px';
        sticker.style.overflow = 'auto';
        sticker.style.zIndex = i + 1;
        
        const content = document.createElement('div');
        content.className = 'sticker-content';
        content.contentEditable = true;
        content.textContent = 'Test sticker ' + i + ' with some content that might be longer for some stickers than others.';
        
        sticker.appendChild(content);
        document.body.appendChild(sticker);
        stickers.push(sticker);
      }
      console.timeEnd('createStickers');
      
      // Wait a bit for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test sticker updates
      console.time('updateStickers');
      for (let i = 0; i < stickers.length; i++) {
        const sticker = stickers[i];
        sticker.style.left = Math.floor(Math.random() * 700) + 'px';
        sticker.style.top = Math.floor(Math.random() * 500) + 'px';
        
        // Force reflow
        sticker.offsetHeight;
      }
      console.timeEnd('updateStickers');
      
      // Wait a bit for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test content updates
      console.time('updateContent');
      for (let i = 0; i < stickers.length; i++) {
        const content = stickers[i].querySelector('.sticker-content');
        content.textContent = 'Updated content for sticker ' + i + ' with new text.';
        
        // Force reflow
        content.offsetHeight;
      }
      console.timeEnd('updateContent');
      
      // Return timing results
      return {
        success: true
      };
    })();
  `);
  
  // Close the test window
  testWindow.close();
  
  console.log('\nRenderer process tests completed');
}

/**
 * Run all performance tests
 */
async function runPerformanceTests() {
  console.log('Starting performance tests...');
  
  // Run file I/O tests
  await testFileIO();
  
  // Run rendering tests
  await testStickerRendering();
  
  // Print performance statistics
  console.log('\n=== Performance Statistics ===');
  
  const metrics = performanceMonitor.getAllMetricStats();
  metrics.forEach(metric => {
    console.log(`\n${metric.name}:`);
    console.log(`  Count: ${metric.count}`);
    console.log(`  Avg: ${metric.avg.toFixed(2)}ms`);
    console.log(`  Min: ${metric.min.toFixed(2)}ms`);
    console.log(`  Max: ${metric.max.toFixed(2)}ms`);
    console.log(`  P50: ${metric.p50.toFixed(2)}ms`);
    console.log(`  P90: ${metric.p90.toFixed(2)}ms`);
  });
  
  console.log('\nPerformance tests completed');
  
  // Exit the application
  app.quit();
}

// Create a test renderer HTML file
fs.writeFileSync(path.join(projectRoot, 'test-renderer.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sticker Rendering Test</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: Arial, sans-serif;
    }
    .sticker {
      position: absolute;
      background-color: #ffeb3b;
      border-radius: 5px;
      box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
      padding: 10px;
      overflow: auto;
    }
    .sticker-content {
      outline: none;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
  </style>
</head>
<body>
  <h1>Sticker Rendering Test</h1>
  <div id="results"></div>
</body>
</html>
`);

// Wait for app to be ready
app.whenReady().then(runPerformanceTests);

// Handle window-all-closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
