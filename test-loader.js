import { isDevelopment } from './utils/environment.js';

/**
 * Test loader that conditionally loads tests based on environment
 */
class TestLoader {
  constructor() {
    this.isEnabled = isDevelopment();
    this.tests = [];
    
    // Log test loader initialization
    console.log(`Test loader initialized. Tests ${this.isEnabled ? 'enabled' : 'disabled'}.`);
  }
  
  /**
   * Register a test module to be run
   * @param {string} name - Test name
   * @param {Function} testFn - Test function to run
   */
  registerTest(name, testFn) {
    if (!this.isEnabled) {
      console.log(`Test "${name}" registered but tests are disabled.`);
      return;
    }
    
    this.tests.push({ name, testFn });
    console.log(`Test "${name}" registered.`);
  }
  
  /**
   * Run all registered tests
   */
  async runTests() {
    if (!this.isEnabled) {
      console.log('Tests are disabled in production mode.');
      return;
    }
    
    console.log(`Running ${this.tests.length} tests...`);
    
    for (const test of this.tests) {
      console.log(`Running test: ${test.name}`);
      try {
        await test.testFn();
        console.log(`✅ Test "${test.name}" passed.`);
      } catch (error) {
        console.error(`❌ Test "${test.name}" failed:`, error);
      }
    }
    
    console.log('All tests completed.');
  }
}

// Create a singleton instance
const testLoader = new TestLoader();

export default testLoader;
