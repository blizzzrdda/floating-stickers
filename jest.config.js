export default {
  // Use Node.js environment for testing
  testEnvironment: 'node',

  // File extensions to consider as test files
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],

  // Directories to ignore
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Transform ES modules
  transform: {},

  // Verbose output
  verbose: true,

  // Only run tests in development mode, not in production
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Global variables
  globals: {
    __DEV__: true
  }
};
