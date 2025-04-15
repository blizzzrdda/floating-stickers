/**
 * Retry Utilities
 * Common retry and error handling functions used throughout the application
 */

import { Logger } from './logger.js';

// Create a logger for retry operations
const logger = new Logger({ category: 'RetryUtils' });

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 300, // ms
  timeout: 5000,   // ms
  exponentialBackoff: true,
  jitter: true
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.retryDelay - Base delay between retries in ms
 * @param {number} options.timeout - Timeout for each attempt in ms
 * @param {boolean} options.exponentialBackoff - Whether to use exponential backoff
 * @param {boolean} options.jitter - Whether to add random jitter to delay
 * @param {Function} options.shouldRetry - Function to determine if retry should be attempted
 * @returns {Promise<any>} - Result of the function
 */
async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  const { maxRetries, retryDelay, exponentialBackoff, jitter } = config;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If this is a retry, log it
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt}/${maxRetries}`);
      }
      
      // Execute the function
      return await fn();
    } catch (err) {
      lastError = err;
      
      // Check if we should retry
      if (attempt >= maxRetries || (config.shouldRetry && !config.shouldRetry(err))) {
        logger.error(`All retry attempts failed (${attempt}/${maxRetries}):`, err);
        break;
      }
      
      // Calculate delay for next retry
      let delay = retryDelay;
      
      // Apply exponential backoff if enabled
      if (exponentialBackoff) {
        delay = retryDelay * Math.pow(2, attempt);
      }
      
      // Add jitter if enabled (±20%)
      if (jitter) {
        const jitterFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
        delay = Math.floor(delay * jitterFactor);
      }
      
      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err);
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

/**
 * Execute a function with a timeout
 * @param {Function} fn - Function to execute
 * @param {number} timeout - Timeout in ms
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<any>} - Result of the function
 */
async function withTimeout(fn, timeout, operationName = 'operation') {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeout}ms`));
    }, timeout);
    
    fn()
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

/**
 * Circuit breaker pattern implementation
 * @param {Function} fn - Function to execute
 * @param {Object} options - Circuit breaker options
 * @param {number} options.failureThreshold - Number of failures before opening circuit
 * @param {number} options.resetTimeout - Time in ms before trying to close circuit
 * @param {Function} options.fallback - Fallback function to call when circuit is open
 * @returns {Function} - Wrapped function with circuit breaker
 */
function circuitBreaker(fn, options = {}) {
  const config = {
    failureThreshold: 3,
    resetTimeout: 30000, // 30 seconds
    fallback: null,
    ...options
  };
  
  let failures = 0;
  let isOpen = false;
  let lastFailureTime = null;
  
  return async (...args) => {
    // If circuit is open, check if we should try to close it
    if (isOpen) {
      const now = Date.now();
      if (now - lastFailureTime >= config.resetTimeout) {
        logger.info('Circuit half-open, testing service...');
        isOpen = false;
        failures = 0;
      } else {
        logger.warn(`Circuit open, using fallback (resets in ${Math.ceil((config.resetTimeout - (now - lastFailureTime)) / 1000)}s)`);
        
        // If fallback is provided, use it
        if (config.fallback) {
          return config.fallback(...args);
        }
        
        throw new Error('Circuit is open');
      }
    }
    
    try {
      // Execute the function
      const result = await fn(...args);
      
      // Success, reset failures
      failures = 0;
      return result;
    } catch (err) {
      // Increment failures
      failures++;
      lastFailureTime = Date.now();
      
      // Check if we should open the circuit
      if (failures >= config.failureThreshold) {
        logger.error(`Circuit opened after ${failures} failures`);
        isOpen = true;
      }
      
      // If fallback is provided and circuit is open, use it
      if (isOpen && config.fallback) {
        logger.warn('Using fallback due to open circuit');
        return config.fallback(...args);
      }
      
      throw err;
    }
  };
}

export {
  withRetry,
  withTimeout,
  circuitBreaker,
  DEFAULT_RETRY_CONFIG
};
