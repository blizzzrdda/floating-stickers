/**
 * Unit tests for validationUtils.js
 */

import { jest } from '@jest/globals';
import {
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
} from '../../../utils/validationUtils.js';

// Mock the Logger class
jest.mock('../../../utils/logger.js', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('validationUtils', () => {
  describe('isNotNullOrUndefined', () => {
    it('should return true for non-null and non-undefined values', () => {
      expect(isNotNullOrUndefined('')).toBe(true);
      expect(isNotNullOrUndefined(0)).toBe(true);
      expect(isNotNullOrUndefined(false)).toBe(true);
      expect(isNotNullOrUndefined({})).toBe(true);
      expect(isNotNullOrUndefined([])).toBe(true);
    });

    it('should return false for null and undefined values', () => {
      expect(isNotNullOrUndefined(null)).toBe(false);
      expect(isNotNullOrUndefined(undefined)).toBe(false);
    });
  });

  describe('isString', () => {
    it('should return true for string values', () => {
      expect(isString('')).toBe(true);
      expect(isString('test')).toBe(true);
      expect(isString(String('test'))).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString(0)).toBe(false);
      expect(isString(false)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty string values', () => {
      expect(isNonEmptyString('test')).toBe(true);
      expect(isNonEmptyString(' test ')).toBe(true);
    });

    it('should return false for empty string values', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString(' ')).toBe(false);
      expect(isNonEmptyString('\t\n')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(0)).toBe(false);
      expect(isNonEmptyString(false)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for number values', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(1)).toBe(true);
      expect(isNumber(-1)).toBe(true);
      expect(isNumber(1.5)).toBe(true);
      expect(isNumber(Number('1'))).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber('')).toBe(false);
      expect(isNumber('1')).toBe(false);
      expect(isNumber(false)).toBe(false);
      expect(isNumber({})).toBe(false);
      expect(isNumber([])).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('should return true for boolean values', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(Boolean(1))).toBe(true);
    });

    it('should return false for non-boolean values', () => {
      expect(isBoolean(null)).toBe(false);
      expect(isBoolean(undefined)).toBe(false);
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('')).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean({})).toBe(false);
      expect(isBoolean([])).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for object values', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject(new Object())).toBe(true);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isObject(undefined)).toBe(false);
      expect(isObject(0)).toBe(false);
      expect(isObject('')).toBe(false);
      expect(isObject(false)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for array values', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(new Array())).toBe(true);
    });

    it('should return false for non-array values', () => {
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
      expect(isArray(0)).toBe(false);
      expect(isArray('')).toBe(false);
      expect(isArray(false)).toBe(false);
      expect(isArray({})).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should return true for function values', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function() {})).toBe(true);
      expect(isFunction(isFunction)).toBe(true);
    });

    it('should return false for non-function values', () => {
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
      expect(isFunction(0)).toBe(false);
      expect(isFunction('')).toBe(false);
      expect(isFunction(false)).toBe(false);
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid Date objects', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2023-01-01'))).toBe(true);
    });

    it('should return false for invalid Date objects', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });

    it('should return false for non-Date values', () => {
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate(0)).toBe(false);
      expect(isValidDate('')).toBe(false);
      expect(isValidDate('2023-01-01')).toBe(false);
      expect(isValidDate(false)).toBe(false);
      expect(isValidDate({})).toBe(false);
      expect(isValidDate([])).toBe(false);
    });
  });

  describe('isValidJSON', () => {
    it('should return true for valid JSON values', () => {
      expect(isValidJSON(null)).toBe(true);
      expect(isValidJSON(0)).toBe(true);
      expect(isValidJSON('')).toBe(true);
      expect(isValidJSON(false)).toBe(true);
      expect(isValidJSON({})).toBe(true);
      expect(isValidJSON([])).toBe(true);
      expect(isValidJSON({ a: 1, b: [2, 3] })).toBe(true);
    });

    it('should return false for values with circular references', () => {
      const obj = {};
      obj.self = obj;
      expect(isValidJSON(obj)).toBe(false);
    });

    it('should return false for values with functions', () => {
      expect(isValidJSON({ fn: () => {} })).toBe(false);
    });

    it('should return false for values with undefined', () => {
      expect(isValidJSON({ a: undefined })).toBe(false);
    });
  });
});
