/**
 * Validation Utilities
 * Common validation functions used throughout the application
 */

import { Logger } from './logger.js';

// Create a logger for validation operations
const logger = new Logger({ category: 'ValidationUtils' });

/**
 * Validates that a value is not null or undefined
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is not null or undefined
 */
function isNotNullOrUndefined(value, name = 'Value') {
  const isValid = value !== null && value !== undefined;
  
  if (!isValid) {
    logger.warn(`${name} is null or undefined`);
  }
  
  return isValid;
}

/**
 * Validates that a value is a string
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is a string
 */
function isString(value, name = 'Value') {
  const isValid = typeof value === 'string';
  
  if (!isValid) {
    logger.warn(`${name} is not a string, got ${typeof value}`);
  }
  
  return isValid;
}

/**
 * Validates that a value is a non-empty string
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is a non-empty string
 */
function isNonEmptyString(value, name = 'Value') {
  const isValid = typeof value === 'string' && value.trim() !== '';
  
  if (!isValid) {
    if (typeof value !== 'string') {
      logger.warn(`${name} is not a string, got ${typeof value}`);
    } else {
      logger.warn(`${name} is an empty string`);
    }
  }
  
  return isValid;
}

/**
 * Validates that a value is a number
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is a number
 */
function isNumber(value, name = 'Value') {
  const isValid = typeof value === 'number' && !isNaN(value);
  
  if (!isValid) {
    logger.warn(`${name} is not a valid number, got ${typeof value}`);
  }
  
  return isValid;
}

/**
 * Validates that a value is a boolean
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is a boolean
 */
function isBoolean(value, name = 'Value') {
  const isValid = typeof value === 'boolean';
  
  if (!isValid) {
    logger.warn(`${name} is not a boolean, got ${typeof value}`);
  }
  
  return isValid;
}

/**
 * Validates that a value is an object
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is an object
 */
function isObject(value, name = 'Value') {
  const isValid = value !== null && typeof value === 'object' && !Array.isArray(value);
  
  if (!isValid) {
    if (value === null) {
      logger.warn(`${name} is null`);
    } else if (Array.isArray(value)) {
      logger.warn(`${name} is an array, not an object`);
    } else {
      logger.warn(`${name} is not an object, got ${typeof value}`);
    }
  }
  
  return isValid;
}

/**
 * Validates that a value is an array
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is an array
 */
function isArray(value, name = 'Value') {
  const isValid = Array.isArray(value);
  
  if (!isValid) {
    logger.warn(`${name} is not an array, got ${typeof value}`);
  }
  
  return isValid;
}

/**
 * Validates that a value is a function
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is a function
 */
function isFunction(value, name = 'Value') {
  const isValid = typeof value === 'function';
  
  if (!isValid) {
    logger.warn(`${name} is not a function, got ${typeof value}`);
  }
  
  return isValid;
}

/**
 * Validates that a value is a valid date
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is a valid date
 */
function isValidDate(value, name = 'Value') {
  const isValid = value instanceof Date && !isNaN(value.getTime());
  
  if (!isValid) {
    if (!(value instanceof Date)) {
      logger.warn(`${name} is not a Date object, got ${typeof value}`);
    } else {
      logger.warn(`${name} is an invalid Date`);
    }
  }
  
  return isValid;
}

/**
 * Validates that a value is a valid JSON object or array
 * @param {any} value - Value to validate
 * @param {string} name - Name of the value for logging
 * @returns {boolean} - True if value is valid JSON
 */
function isValidJSON(value, name = 'Value') {
  try {
    // Test if the value can be stringified and parsed
    JSON.parse(JSON.stringify(value));
    return true;
  } catch (err) {
    logger.warn(`${name} is not valid JSON: ${err.message}`);
    return false;
  }
}

export {
  isNotNullOrUndefined,
  isString,
  isNonEmptyString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  isValidDate,
  isValidJSON
};
