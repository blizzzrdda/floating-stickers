/**
 * Debug utilities for the Sticker application
 */

// Debug flag - can be set via environment variable
const DEBUG_ENABLED = process.env.DEBUG_STICKER === 'true';

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current log level - can be set via environment variable
const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL ? 
  (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO) : 
  LOG_LEVELS.INFO;

/**
 * Debug logger with timestamp and category
 * @param {string} category - Category/component name
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 * @param {number} level - Log level (0=debug, 1=info, 2=warn, 3=error)
 */
function log(category, message, data = null, level = LOG_LEVELS.DEBUG) {
  // Skip if debug is disabled or level is below current level
  if (!DEBUG_ENABLED && level < LOG_LEVELS.ERROR) return;
  if (level < CURRENT_LOG_LEVEL) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${category}]`;
  
  switch (level) {
    case LOG_LEVELS.DEBUG:
      console.debug(`${prefix} ${message}`, data !== null ? data : '');
      break;
    case LOG_LEVELS.INFO:
      console.info(`${prefix} ${message}`, data !== null ? data : '');
      break;
    case LOG_LEVELS.WARN:
      console.warn(`${prefix} ${message}`, data !== null ? data : '');
      break;
    case LOG_LEVELS.ERROR:
      console.error(`${prefix} ${message}`, data !== null ? data : '');
      break;
  }
}

/**
 * Debug logger for debug level
 * @param {string} category - Category/component name
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function debug(category, message, data = null) {
  log(category, message, data, LOG_LEVELS.DEBUG);
}

/**
 * Debug logger for info level
 * @param {string} category - Category/component name
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function info(category, message, data = null) {
  log(category, message, data, LOG_LEVELS.INFO);
}

/**
 * Debug logger for warn level
 * @param {string} category - Category/component name
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function warn(category, message, data = null) {
  log(category, message, data, LOG_LEVELS.WARN);
}

/**
 * Debug logger for error level
 * @param {string} category - Category/component name
 * @param {string} message - Log message
 * @param {any} data - Optional data to log
 */
function error(category, message, data = null) {
  log(category, message, data, LOG_LEVELS.ERROR);
}

/**
 * Enable debug mode programmatically
 * @param {boolean} enable - Whether to enable debug mode
 */
function setDebugEnabled(enable = true) {
  process.env.DEBUG_STICKER = enable ? 'true' : 'false';
}

/**
 * Set the current log level
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level.toUpperCase()] !== undefined) {
    process.env.LOG_LEVEL = level.toUpperCase();
  }
}

export {
  debug,
  info,
  warn,
  error,
  setDebugEnabled,
  setLogLevel,
  LOG_LEVELS
};
