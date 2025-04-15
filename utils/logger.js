/**
 * Advanced Logger Utility for the Sticker application
 * Provides console and file logging with different log levels
 */

import fs from 'fs';
import path from 'path';
import { isDevelopment, isTest, isProduction } from './environment.js';
import { debug, info, warn, error, LOG_LEVELS } from './debugUtils.js';

// Default log directory
const DEFAULT_LOG_DIR = path.join(process.cwd(), 'logs');

// Maximum log file size in bytes (5MB)
const MAX_LOG_FILE_SIZE = 5 * 1024 * 1024;

// Maximum number of log files to keep
const MAX_LOG_FILES = 10;

/**
 * Format error object for logging
 * @param {Error} err - Error object
 * @returns {Object} Formatted error object
 */
function formatError(err) {
  if (!err) return null;

  // If it's not an Error object, just return it
  if (!(err instanceof Error)) {
    return err;
  }

  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    // Include additional properties that might be present on custom errors
    ...(err.code && { code: err.code }),
    ...(err.errno && { errno: err.errno }),
    ...(err.syscall && { syscall: err.syscall }),
    ...(err.path && { path: err.path }),
    ...(err.status && { status: err.status }),
    ...(err.statusCode && { statusCode: err.statusCode })
  };
}

/**
 * Sanitize sensitive data before logging
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
function sanitizeData(data) {
  if (!data) return data;

  // If it's a string, check for sensitive patterns
  if (typeof data === 'string') {
    // Mask API keys, tokens, passwords, etc.
    return data
      .replace(/(api[_-]?key|token|password|secret)[=:]["']?([^"'&]+)/gi, '$1=***REDACTED***')
      .replace(/(sk-\w{20})\w+/g, '$1***REDACTED***'); // OpenAI API key pattern
  }

  // If it's an object, recursively sanitize its properties
  if (typeof data === 'object' && data !== null) {
    const sanitized = Array.isArray(data) ? [] : {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Skip sanitizing Error objects to preserve stack traces
        if (data[key] instanceof Error) {
          sanitized[key] = formatError(data[key]);
        }
        // Mask sensitive fields
        else if (/^(api[_-]?key|token|password|secret|authorization)$/i.test(key)) {
          sanitized[key] = '***REDACTED***';
        }
        // Recursively sanitize nested objects
        else {
          sanitized[key] = sanitizeData(data[key]);
        }
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Advanced Logger class with file logging capabilities
 */
class Logger {
  /**
   * Create a new Logger instance
   * @param {Object} options - Logger options
   * @param {string} options.category - Logger category/component name
   * @param {boolean} options.enableConsole - Enable console logging
   * @param {boolean} options.enableFile - Enable file logging
   * @param {string} options.logDir - Directory for log files
   * @param {number} options.logLevel - Minimum log level to record
   */
  constructor(options = {}) {
    this.category = options.category || 'App';
    this.enableConsole = true; // Always enable console logging
    this.enableFile = false; // Always disable file logging
    this.logDir = options.logDir || DEFAULT_LOG_DIR;
    this.logLevel = options.logLevel || (isDevelopment() ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);

    // No need to set up log directory since file logging is disabled
  }

  /**
   * Set up log directory - no-op since we're using console only
   */
  setupLogDirectory() {
    // No-op - all logging redirected to console
    console.log('[Logger] Log directory setup skipped - using console only');
  }

  /**
   * Rotate log files if they exceed the maximum size - no-op since we're using console only
   */
  rotateLogFilesIfNeeded() {
    // No-op - all logging redirected to console
  }

  /**
   * Rotate a specific log file if it exceeds the maximum size - no-op since we're using console only
   * @param {string} logFile - Path to log file
   */
  rotateLogFileIfNeeded(logFile) {
    // No-op - all logging redirected to console
  }

  /**
   * Clean up old log files to prevent disk space issues - no-op since we're using console only
   */
  cleanupOldLogFiles() {
    // No-op - all logging redirected to console
  }

  /**
   * Remove a directory and all its contents - no-op since we're using console only
   * @param {string} dirPath - Path to directory
   */
  removeDirectory(dirPath) {
    // No-op - all logging redirected to console
  }

  /**
   * Write to log file - redirected to console
   * @param {string} message - Log message
   * @param {number} level - Log level
   */
  writeToFile(message, level) {
    // Redirect all file logging to console
    try {
      switch (level) {
        case LOG_LEVELS.DEBUG:
          console.debug(message);
          break;
        case LOG_LEVELS.INFO:
          console.info(message);
          break;
        case LOG_LEVELS.WARN:
          console.warn(message);
          break;
        case LOG_LEVELS.ERROR:
          console.error(message);
          break;
        default:
          console.log(message);
      }
    } catch (err) {
      console.error('Failed to log message:', err);
    }
  }

  /**
   * Format log message
   * @param {string} message - Log message
   * @param {any} data - Log data
   * @param {number} level - Log level
   * @returns {string} Formatted log message
   */
  formatLogMessage(message, data, level) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
    const prefix = `[${timestamp}] [${levelName}] [${this.category}]`;

    let formattedData = '';
    if (data !== null && data !== undefined) {
      if (data instanceof Error) {
        data = formatError(data);
      } else {
        data = sanitizeData(data);
      }

      try {
        formattedData = typeof data === 'object'
          ? '\n' + JSON.stringify(data, null, 2)
          : ' ' + String(data);
      } catch (err) {
        formattedData = ' [Unserializable data]';
      }
    }

    return `${prefix} ${message}${formattedData}`;
  }

  /**
   * Log a message
   * @param {string} message - Log message
   * @param {any} data - Log data
   * @param {number} level - Log level
   */
  log(message, data = null, level = LOG_LEVELS.INFO) {
    // Skip if level is below current level
    if (level < this.logLevel) return;

    const formattedMessage = this.formatLogMessage(message, data, level);

    // Always log to console
    switch (level) {
      case LOG_LEVELS.DEBUG:
        debug(this.category, message, data);
        break;
      case LOG_LEVELS.INFO:
        info(this.category, message, data);
        break;
      case LOG_LEVELS.WARN:
        warn(this.category, message, data);
        break;
      case LOG_LEVELS.ERROR:
        error(this.category, message, data);
        break;
    }

    // File logging is disabled
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {any} data - Log data
   */
  debug(message, data = null) {
    this.log(message, data, LOG_LEVELS.DEBUG);
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {any} data - Log data
   */
  info(message, data = null) {
    this.log(message, data, LOG_LEVELS.INFO);
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {any} data - Log data
   */
  warn(message, data = null) {
    this.log(message, data, LOG_LEVELS.WARN);
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {any} data - Log data
   */
  error(message, data = null) {
    this.log(message, data, LOG_LEVELS.ERROR);
  }

  /**
   * Create a child logger with a different category
   * @param {string} category - Category for the child logger
   * @returns {Logger} Child logger
   */
  child(category) {
    return new Logger({
      ...this,
      category
    });
  }
}

// Create a default logger instance
const defaultLogger = new Logger({ category: 'App' });

export {
  Logger,
  defaultLogger,
  formatError,
  sanitizeData,
  LOG_LEVELS
};
