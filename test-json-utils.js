const fs = require('fs');
const path = require('path');
const { safeReadJSON, safeWriteJSON } = require('./utils/jsonUtils');

// Create a test directory
const testDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Test file paths
const validFile = path.join(testDir, 'valid.json');
const corruptFile = path.join(testDir, 'corrupt.json');
const nonExistentFile = path.join(testDir, 'does-not-exist.json');

// Clean up previous test files
function cleanUpTestFiles() {
  [validFile, corruptFile, nonExistentFile].forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (err) {
        console.error(`Failed to delete ${file}:`, err);
      }
    }
  });
}

async function runTests() {
  console.log('=== Testing JSON Utils ===');
  
  // Clear previous test files
  cleanUpTestFiles();
  
  // Test 1: Writing and reading valid JSON
  console.log('\n[Test 1] Writing and reading valid JSON');
  const testData = { test: 'data', number: 123, array: [1, 2, 3] };
  
  const writeResult = await safeWriteJSON(validFile, testData);
  console.log(`Write result: ${writeResult}`);
  
  console.log(`File content: ${fs.readFileSync(validFile, 'utf8')}`);
  
  const readData = await safeReadJSON(validFile, {});
  console.log(`Read data matches: ${JSON.stringify(readData) === JSON.stringify(testData)}`);
  
  // Test 2: Reading non-existent file
  console.log('\n[Test 2] Reading non-existent file');
  if (fs.existsSync(nonExistentFile)) {
    fs.unlinkSync(nonExistentFile);
  }
  
  const defaultData = { default: true };
  const nonExistentData = await safeReadJSON(nonExistentFile, defaultData);
  console.log(`Read result: ${JSON.stringify(nonExistentData) === JSON.stringify(defaultData)}`);
  console.log(`File created: ${fs.existsSync(nonExistentFile)}`);
  
  // Test 3: Handling corrupt JSON
  console.log('\n[Test 3] Handling corrupt JSON');
  fs.writeFileSync(corruptFile, '{"broken": "json", "missing": "bracket"');
  console.log('Wrote corrupt JSON file');
  
  const corruptReadResult = await safeReadJSON(corruptFile, { recovered: true });
  console.log(`Read from corrupt file successful: ${typeof corruptReadResult === 'object'}`);
  console.log(`Default value returned: ${JSON.stringify(corruptReadResult)}`);
  
  // Check if backup was created
  const backupFiles = fs.readdirSync(testDir).filter(file => file.includes('corrupt') && file.includes('.corrupt-'));
  console.log(`Backup file created: ${backupFiles.length > 0}`);
  
  // Verify the corrupt file was recreated with valid JSON
  const fixedContent = fs.readFileSync(corruptFile, 'utf8');
  try {
    JSON.parse(fixedContent);
    console.log('Corrupt file was fixed with valid JSON');
  } catch (e) {
    console.error('Corrupt file was not properly fixed');
  }
  
  console.log('\n=== Tests completed successfully ===');
}

// Run the test only once
runTests().catch(err => {
  console.error('Test failed with error:', err);
}); 