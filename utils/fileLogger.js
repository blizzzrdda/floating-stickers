/**
 * File Logger for the Sticker application
 * Handles writing logs to files with rotation and cleanup
 */

import fs from 'fs';
import path from 'path';
import { isTest } from './environment.js';
import { LOG_LEVELS } from './debugUtils.js';

// Default log directory
const DEFAULT_LOG_DIR = path.join(process.cwd(), 'logs');

// Default log file name
const DEFAULT_LOG_FILE = 'sticker-app.log';

// Maximum log file size in bytes (5MB)
const MAX_LOG_FILE_SIZE = 5 * 1024 * 1024;

// Maximum number of log files to keep
const MAX_LOG_FILES = 10;

/**
 * File Logger class
 */
class FileLogger {
  /**
   * Create a new FileLogger instance
   * @param {Object} options - Logger options
   * @param {string} options.logDir - Directory for log files
   * @param {string} options.logFile - Base name for log files
   * @param {boolean} options.useTimestamp - Whether to include timestamp in log file names
   * @param {boolean} options.useLevelPrefix - Whether to prefix log files with level name
   * @param {boolean} options.createSubdirs - Whether to create subdirectories for each day
   */
  constructor(options = {}) {
    this.logDir = options.logDir || DEFAULT_LOG_DIR;
    this.logFile = options.logFile || DEFAULT_LOG_FILE;
    this.useTimestamp = options.useTimestamp !== false;
    this.useLevelPrefix = options.useLevelPrefix !== false;
    this.createSubdirs = options.createSubdirs !== false;

    // No directory setup needed - all logging redirected to console
    console.log('[FileLogger] Initialized with console-only logging');
  }

  /**
   * Set up log directory - no-op since we're using console only
   */
  setupLogDirectory() {
    // No-op - all logging redirected to console
    console.log('[FileLogger] Log directory setup skipped - using console only');
  }

  /**
   * Get the path for a log file - returns a dummy path since we're using console only
   * @param {string} level - Log level name
   * @returns {string} Dummy log file path
   */
  getLogFilePath(level) {
    // Return a dummy path - all logging redirected to console
    return `console-${level}.log`;
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
   * Append message to a file - redirected to console
   * @param {string} filePath - Path to file
   * @param {string} message - Message to append
   */
  appendToFile(filePath, message) {
    // Redirect all file operations to console
    console.log(`[${path.basename(filePath)}] ${message}`);
  }

  /**
   * Log a message to file - redirected to console
   * @param {string} message - Log message
   * @param {number} level - Log level
   */
  log(message, level = LOG_LEVELS.INFO) {
    // Redirect to console
    this.writeToFile(message, level);
  }
}

export {
  FileLogger,
  DEFAULT_LOG_DIR,
  MAX_LOG_FILE_SIZE,
  MAX_LOG_FILES
};
