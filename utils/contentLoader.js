/**
 * Content Loader Utility
 * Provides robust content loading with retry mechanisms, validation, error handling, and recovery
 */

import { Logger } from './logger.js';
import { safeReadJSON, validateArrayData, validateJSONData } from './jsonUtils.js';
import { handleContentLoadingError, ERROR_CATEGORIES, categorizeError } from './errorHandler.js';
import { recoverContent, circuitBreaker } from './contentRecovery.js';
import { displayError, displayWarning, displayInfo } from '../ui/errorDisplay.js';

// Create a logger for content loading
const logger = new Logger({ category: 'ContentLoader' });

// Default configuration for content loading
const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelay: 300, // ms
  timeout: 5000,    // ms
  validateContent: true
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts
 * @param {number} options.retryDelay - Base delay between retries in ms
 * @param {number} options.timeout - Timeout for each attempt in ms
 * @param {string} options.operationKey - Key for circuit breaker
 * @param {boolean} options.showErrors - Whether to display errors to the user
 * @returns {Promise<any>} - Result of the function
 */
async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  let lastError;

  // Use circuit breaker if operation key is provided
  if (config.operationKey) {
    try {
      return await circuitBreaker.execute(config.operationKey, fn);
    } catch (err) {
      // If circuit is open, throw the error
      if (err.message?.includes('Circuit breaker is open')) {
        logger.warn(`Circuit breaker is open for ${config.operationKey}`, err);

        if (config.showErrors) {
          displayWarning(`Operation ${config.operationKey} is temporarily disabled due to repeated failures. Please try again later.`);
        }

        throw err;
      }

      // Otherwise, continue with retry logic
      lastError = err;
    }
  }

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = config.retryDelay * Math.pow(2, attempt - 1);
        logger.debug(`Retry attempt ${attempt}/${config.maxRetries} after ${delay}ms delay`);

        if (config.showErrors && attempt === 1) {
          displayInfo(`Retrying operation... (${attempt}/${config.maxRetries})`);
        }

        await new Promise(resolve => {
          const timer = setTimeout(resolve, delay);
          // Prevent timer from keeping Node.js process alive
          if (timer.unref) timer.unref();
        });
      }

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => {
          const timeoutError = new Error(`Operation timed out after ${config.timeout}ms`);
          timeoutError.code = 'TIMEOUT';
          reject(timeoutError);
        }, config.timeout);
        // Prevent timer from keeping Node.js process alive
        if (timer.unref) timer.unref();
      });

      // Race the function against the timeout
      return await Promise.race([fn(), timeoutPromise]);
    } catch (err) {
      lastError = err;
      logger.warn(`Attempt ${attempt + 1}/${config.maxRetries + 1} failed:`, err);

      // Show error on last retry if enabled
      if (config.showErrors && attempt === config.maxRetries) {
        const errorInfo = handleContentLoadingError(err, { attempt, maxRetries: config.maxRetries });
        displayError(errorInfo, () => {
          // Reset circuit breaker if using one
          if (config.operationKey) {
            circuitBreaker.reset(config.operationKey);
          }

          // Retry function will be handled by the caller
        });
      }
    }
  }

  logger.error(`All ${config.maxRetries + 1} attempts failed. Last error:`, lastError);
  throw lastError;
}

/**
 * Load and validate content from a JSON file with retry mechanism, error handling, and recovery
 * @param {string} filePath - Path to the JSON file
 * @param {any} defaultValue - Default value to return if file doesn't exist or is invalid
 * @param {Object} options - Loading options
 * @param {number} options.maxRetries - Maximum number of retry attempts
 * @param {number} options.retryDelay - Base delay between retries in ms
 * @param {number} options.timeout - Timeout for each attempt in ms
 * @param {boolean} options.validateContent - Whether to validate the content
 * @param {Function} options.validator - Custom validator function
 * @param {boolean} options.showErrors - Whether to display errors to the user
 * @param {boolean} options.useRecovery - Whether to attempt recovery on failure
 * @param {string} options.operationKey - Key for circuit breaker
 * @returns {Promise<Object>} - Result object with loaded content and metadata
 */
async function loadContent(filePath, defaultValue = {}, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const operationKey = config.operationKey || `load:${filePath}`;

  logger.debug(`Loading content from ${filePath} with ${config.maxRetries} max retries`);

  try {
    // Use retry mechanism for loading content
    const content = await withRetry(
      async () => await safeReadJSON(filePath, null),
      {
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
        timeout: config.timeout,
        operationKey,
        showErrors: config.showErrors
      }
    );

    // If content is null, it means the file doesn't exist or couldn't be read
    if (content === null) {
      logger.info(`No content found at ${filePath}, using default value`);

      // Attempt recovery if enabled
      if (config.useRecovery) {
        logger.info(`Attempting to recover content for ${filePath}`);

        const recoveryResult = await recoverContent(
          filePath,
          ERROR_CATEGORIES.FILE_NOT_FOUND,
          defaultValue
        );

        if (recoveryResult.success) {
          logger.info(`Successfully recovered content for ${filePath} using ${recoveryResult.recoveryMethod}`);

          if (config.showErrors) {
            displayInfo(`Content recovered successfully from ${recoveryResult.recoveryMethod}.`);
          }

          return {
            content: recoveryResult.content,
            source: recoveryResult.recoveryMethod,
            recovered: true
          };
        }
      }

      return {
        content: defaultValue,
        source: 'default',
        recovered: false
      };
    }

    // Validate content if required
    if (config.validateContent) {
      const validator = config.validator || validateJSONData;
      if (!validator(content)) {
        logger.warn(`Content validation failed for ${filePath}`);

        // Attempt recovery if enabled
        if (config.useRecovery) {
          logger.info(`Attempting to recover content for ${filePath} due to validation failure`);

          const recoveryResult = await recoverContent(
            filePath,
            ERROR_CATEGORIES.FILE_CORRUPTED,
            defaultValue
          );

          if (recoveryResult.success) {
            logger.info(`Successfully recovered content for ${filePath} using ${recoveryResult.recoveryMethod}`);

            if (config.showErrors) {
              displayInfo(`Content recovered successfully from ${recoveryResult.recoveryMethod}.`);
            }

            return {
              content: recoveryResult.content,
              source: recoveryResult.recoveryMethod,
              recovered: true
            };
          }
        }

        if (config.showErrors) {
          displayWarning(`Content validation failed for ${path.basename(filePath)}. Using default values.`);
        }

        return {
          content: defaultValue,
          source: 'default',
          recovered: false
        };
      }
    }

    logger.debug(`Successfully loaded and validated content from ${filePath}`);
    return {
      content,
      source: 'file',
      recovered: false
    };
  } catch (err) {
    logger.error(`Failed to load content from ${filePath} after all retries:`, err);

    // Categorize the error
    const errorCategory = categorizeError(err);

    // Attempt recovery if enabled
    if (config.useRecovery) {
      logger.info(`Attempting to recover content for ${filePath} after error: ${errorCategory}`);

      const recoveryResult = await recoverContent(
        filePath,
        errorCategory,
        defaultValue
      );

      if (recoveryResult.success) {
        logger.info(`Successfully recovered content for ${filePath} using ${recoveryResult.recoveryMethod}`);

        if (config.showErrors) {
          displayInfo(`Content recovered successfully from ${recoveryResult.recoveryMethod}.`);
        }

        return {
          content: recoveryResult.content,
          source: recoveryResult.recoveryMethod,
          recovered: true,
          error: err
        };
      }
    }

    return {
      content: defaultValue,
      source: 'default',
      recovered: false,
      error: err
    };
  }
}

/**
 * Load array content from a JSON file with retry mechanism, error handling, and recovery
 * @param {string} filePath - Path to the JSON file
 * @param {Array} defaultValue - Default array to return if file doesn't exist or is invalid
 * @param {Object} options - Loading options
 * @returns {Promise<Object>} - Result object with loaded content and metadata
 */
async function loadArrayContent(filePath, defaultValue = [], options = {}) {
  const result = await loadContent(filePath, defaultValue, {
    ...options,
    validator: validateArrayData,
    operationKey: options.operationKey || `loadArray:${filePath}`
  });

  // Ensure the content is always an array
  if (!Array.isArray(result.content)) {
    logger.warn(`Content from ${filePath} is not an array, using default value`);

    if (options.showErrors) {
      displayWarning(`Content from ${path.basename(filePath)} is not in the expected format. Using default values.`);
    }

    return {
      ...result,
      content: defaultValue,
      source: 'default'
    };
  }

  return result;
}

/**
 * Validate sticker content item
 * @param {Object} item - Sticker content item to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateStickerContent(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.trim() !== '' &&
    (item.content === undefined || typeof item.content === 'string')
  );
}

/**
 * Validate sticker layout item
 * @param {Object} item - Sticker layout item to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateStickerLayout(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.trim() !== '' &&
    typeof item.position === 'object' &&
    typeof item.position.x === 'number' &&
    typeof item.position.y === 'number' &&
    typeof item.size === 'object' &&
    typeof item.size.width === 'number' &&
    typeof item.size.height === 'number'
  );
}

/**
 * Validate array of sticker content items
 * @param {Array} items - Array of sticker content items
 * @returns {boolean} - True if all items are valid, false otherwise
 */
function validateStickerContentArray(items) {
  if (!Array.isArray(items)) return false;
  return items.every(validateStickerContent);
}

/**
 * Validate array of sticker layout items
 * @param {Array} items - Array of sticker layout items
 * @returns {boolean} - True if all items are valid, false otherwise
 */
function validateStickerLayoutArray(items) {
  if (!Array.isArray(items)) return false;
  return items.every(validateStickerLayout);
}

/**
 * Load content with error handling and user feedback
 * @param {string} filePath - Path to the JSON file
 * @param {any} defaultValue - Default value to return if file doesn't exist or is invalid
 * @param {Object} options - Loading options
 * @returns {Promise<Object>} - Result object with loaded content and metadata
 */
async function loadContentWithFeedback(filePath, defaultValue = {}, options = {}) {
  return loadContent(filePath, defaultValue, {
    ...options,
    showErrors: true,
    useRecovery: true
  });
}

/**
 * Load array content with error handling and user feedback
 * @param {string} filePath - Path to the JSON file
 * @param {Array} defaultValue - Default array to return if file doesn't exist or is invalid
 * @param {Object} options - Loading options
 * @returns {Promise<Object>} - Result object with loaded content and metadata
 */
async function loadArrayContentWithFeedback(filePath, defaultValue = [], options = {}) {
  return loadArrayContent(filePath, defaultValue, {
    ...options,
    showErrors: true,
    useRecovery: true
  });
}

export {
  loadContent,
  loadArrayContent,
  loadContentWithFeedback,
  loadArrayContentWithFeedback,
  withRetry,
  validateStickerContent,
  validateStickerLayout,
  validateStickerContentArray,
  validateStickerLayoutArray
};
