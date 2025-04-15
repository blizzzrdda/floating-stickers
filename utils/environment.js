/**
 * Environment detection utilities
 */

/**
 * Check if the app is running in development mode
 * @returns {boolean} True if in development mode
 */
export function isDevelopment() {
  // Check if app is packaged (production) or not (development)
  if (typeof process.env.ELECTRON_IS_PACKAGED === 'string') {
    return process.env.ELECTRON_IS_PACKAGED !== 'true';
  }
  
  // Check NODE_ENV
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  
  // Default to development if we can't determine
  return true;
}

/**
 * Check if the app is running in a test environment
 * @returns {boolean} True if in test environment
 */
export function isTest() {
  return process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
}

/**
 * Check if the app is running in production mode
 * @returns {boolean} True if in production mode
 */
export function isProduction() {
  return !isDevelopment();
}

/**
 * Get the current environment name
 * @returns {string} Environment name ('development', 'test', or 'production')
 */
export function getEnvironment() {
  if (isTest()) return 'test';
  if (isDevelopment()) return 'development';
  return 'production';
}

export default {
  isDevelopment,
  isTest,
  isProduction,
  getEnvironment
};
