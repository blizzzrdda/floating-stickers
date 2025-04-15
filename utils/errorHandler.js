/**
 * Error Handler for the Sticker application
 * Provides centralized error handling and categorization
 */

import { Logger } from './logger.js';
import { isDevelopment } from './environment.js';

// Error categories
const ERROR_CATEGORIES = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN'
};

// Create a logger for error handling
const logger = new Logger({ category: 'ErrorHandler' });

/**
 * Categorize an error based on its properties
 * @param {Error} err - Error object
 * @returns {string} Error category
 */
function categorizeError(err) {
  if (!err) return ERROR_CATEGORIES.UNKNOWN;

  // Check for file not found errors
  if (
    err.code === 'ENOENT' ||
    err.message?.includes('no such file') ||
    err.message?.includes('not found')
  ) {
    return ERROR_CATEGORIES.FILE_NOT_FOUND;
  }

  // Check for permission errors
  if (
    err.code === 'EACCES' ||
    err.code === 'EPERM' ||
    err.message?.includes('permission denied') ||
    err.message?.includes('access denied')
  ) {
    return ERROR_CATEGORIES.PERMISSION_DENIED;
  }

  // Check for file corruption errors
  if (
    err.message?.includes('JSON') ||
    err.message?.includes('parse') ||
    err.message?.includes('syntax') ||
    err.message?.includes('corrupt')
  ) {
    return ERROR_CATEGORIES.FILE_CORRUPTED;
  }

  // Check for network errors
  if (
    err.code === 'ENOTFOUND' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ECONNRESET' ||
    err.message?.includes('network') ||
    err.message?.includes('connection')
  ) {
    return ERROR_CATEGORIES.NETWORK_ERROR;
  }

  // Check for timeout errors
  if (
    err.code === 'ETIMEDOUT' ||
    err.message?.includes('timeout') ||
    err.message?.includes('timed out')
  ) {
    return ERROR_CATEGORIES.TIMEOUT;
  }

  // Check for validation errors
  if (
    err.message?.toLowerCase().includes('validation') ||
    err.message?.toLowerCase().includes('invalid') ||
    err.message?.toLowerCase().includes('schema')
  ) {
    return ERROR_CATEGORIES.VALIDATION_ERROR;
  }

  // Default to unknown
  return ERROR_CATEGORIES.UNKNOWN;
}

/**
 * Get user-friendly error message based on error category
 * @param {string} category - Error category
 * @param {Error} err - Original error
 * @returns {string} User-friendly error message
 */
function getUserFriendlyMessage(category, err) {
  switch (category) {
    case ERROR_CATEGORIES.FILE_NOT_FOUND:
      return 'The required file could not be found. Your data may have been moved or deleted.';

    case ERROR_CATEGORIES.PERMISSION_DENIED:
      return 'You don\'t have permission to access this file. Try running the application as administrator.';

    case ERROR_CATEGORIES.FILE_CORRUPTED:
      return 'The data file appears to be corrupted. The application will try to recover your data.';

    case ERROR_CATEGORIES.NETWORK_ERROR:
      return 'A network error occurred. Please check your internet connection and try again.';

    case ERROR_CATEGORIES.TIMEOUT:
      return 'The operation timed out. Please try again later.';

    case ERROR_CATEGORIES.VALIDATION_ERROR:
      return 'The data format is invalid. The application will try to fix this automatically.';

    case ERROR_CATEGORIES.UNKNOWN:
    default:
      return isDevelopment()
        ? `An unexpected error occurred: ${err.message}`
        : 'An unexpected error occurred. Please restart the application.';
  }
}

/**
 * Generate a unique error reference code
 * @returns {string} Error reference code
 */
function generateErrorCode() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Handle an error with logging and categorization
 * @param {Error} err - Error object
 * @param {Object} context - Additional context for the error
 * @returns {Object} Processed error information
 */
function handleError(err, context = {}) {
  // Generate a unique error code for reference
  const errorCode = generateErrorCode();

  // Categorize the error
  const category = categorizeError(err);

  // Get user-friendly message
  const userMessage = getUserFriendlyMessage(category, err);

  // Log the error with full context
  logger.error(`Error [${errorCode}] [${category}]: ${err.message}`, {
    error: err,
    category,
    context,
    errorCode
  });

  // Return processed error information
  return {
    errorCode,
    category,
    message: err.message,
    userMessage,
    timestamp: new Date().toISOString(),
    recoverable: category !== ERROR_CATEGORIES.UNKNOWN
  };
}

/**
 * Wrap an async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {Object} context - Additional context for errors
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      return handleError(err, {
        ...context,
        arguments: args
      });
    }
  };
}

/**
 * Handle content loading errors specifically
 * @param {Error} err - Error object
 * @param {Object} context - Additional context for the error
 * @returns {Object} Processed error information
 */
function handleContentLoadingError(err, context = {}) {
  // Add content loading specific context
  const contentContext = {
    ...context,
    operation: 'content-loading'
  };

  return handleError(err, contentContext);
}

export {
  ERROR_CATEGORIES,
  categorizeError,
  getUserFriendlyMessage,
  generateErrorCode,
  handleError,
  withErrorHandling,
  handleContentLoadingError
};
