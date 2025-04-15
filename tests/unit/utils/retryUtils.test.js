/**
 * Unit tests for retryUtils.js
 */

import { jest } from '@jest/globals';
import {
  withRetry,
  withTimeout,
  circuitBreaker,
  DEFAULT_RETRY_CONFIG
} from '../../../utils/retryUtils.js';

// Mock the Logger class
jest.mock('../../../utils/logger.js', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('retryUtils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock setTimeout to execute immediately
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withRetry', () => {
    it('should return the result if the function succeeds on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn);
      
      expect(fn).toHaveBeenCalledTimes(1);
      expect(result).toBe('success');
    });
    
    it('should retry the function if it fails', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success');
      
      const result = await withRetry(fn, { maxRetries: 2, retryDelay: 10 });
      
      // Fast-forward timers to execute setTimeout callbacks
      jest.runAllTimers();
      
      expect(fn).toHaveBeenCalledTimes(3);
      expect(result).toBe('success');
    });
    
    it('should throw an error if all retries fail', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      
      await expect(withRetry(fn, { maxRetries: 2, retryDelay: 10 }))
        .rejects.toThrow(error);
      
      // Fast-forward timers to execute setTimeout callbacks
      jest.runAllTimers();
      
      expect(fn).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries
    });
    
    it('should not retry if shouldRetry returns false', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      const shouldRetry = jest.fn().mockReturnValue(false);
      
      await expect(withRetry(fn, { maxRetries: 2, shouldRetry }))
        .rejects.toThrow(error);
      
      expect(fn).toHaveBeenCalledTimes(1); // Only initial attempt
      expect(shouldRetry).toHaveBeenCalledWith(error);
    });
    
    it('should use exponential backoff if enabled', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success');
      
      // Mock setTimeout to capture delay values
      const originalSetTimeout = global.setTimeout;
      const mockSetTimeout = jest.fn((callback, delay) => {
        return originalSetTimeout(callback, 0); // Execute immediately for testing
      });
      global.setTimeout = mockSetTimeout;
      
      await withRetry(fn, { 
        maxRetries: 2, 
        retryDelay: 100, 
        exponentialBackoff: true,
        jitter: false
      });
      
      expect(fn).toHaveBeenCalledTimes(3);
      
      // First retry should use base delay
      expect(mockSetTimeout.mock.calls[0][1]).toBe(100);
      
      // Second retry should use exponential backoff (base * 2^1)
      expect(mockSetTimeout.mock.calls[1][1]).toBe(200);
      
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('withTimeout', () => {
    it('should resolve with the function result if it completes before timeout', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await withTimeout(fn, 1000, 'test');
      
      expect(fn).toHaveBeenCalledTimes(1);
      expect(result).toBe('success');
    });
    
    it('should reject with a timeout error if the function takes too long', async () => {
      // Create a function that never resolves
      const fn = jest.fn().mockImplementation(() => new Promise(() => {}));
      
      const promise = withTimeout(fn, 1000, 'test');
      
      // Fast-forward time past the timeout
      jest.advanceTimersByTime(1001);
      
      await expect(promise).rejects.toThrow('test timed out after 1000ms');
      expect(fn).toHaveBeenCalledTimes(1);
    });
    
    it('should reject with the function error if it fails', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      
      await expect(withTimeout(fn, 1000, 'test')).rejects.toThrow(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('circuitBreaker', () => {
    it('should execute the function normally when circuit is closed', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const wrappedFn = circuitBreaker(fn);
      
      const result = await wrappedFn('arg1', 'arg2');
      
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('success');
    });
    
    it('should open the circuit after reaching failure threshold', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      const wrappedFn = circuitBreaker(fn, { failureThreshold: 2 });
      
      // First failure
      await expect(wrappedFn()).rejects.toThrow(error);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Second failure - should open the circuit
      await expect(wrappedFn()).rejects.toThrow(error);
      expect(fn).toHaveBeenCalledTimes(2);
      
      // Third call - circuit should be open
      await expect(wrappedFn()).rejects.toThrow('Circuit is open');
      expect(fn).toHaveBeenCalledTimes(2); // Function not called again
    });
    
    it('should use fallback when circuit is open', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      const fallback = jest.fn().mockReturnValue('fallback');
      
      const wrappedFn = circuitBreaker(fn, { 
        failureThreshold: 2,
        fallback
      });
      
      // First failure
      await expect(wrappedFn('arg1')).rejects.toThrow(error);
      
      // Second failure - should open the circuit
      await expect(wrappedFn('arg1')).rejects.toThrow(error);
      
      // Third call - circuit is open, should use fallback
      const result = await wrappedFn('arg1');
      
      expect(fallback).toHaveBeenCalledWith('arg1');
      expect(result).toBe('fallback');
    });
    
    it('should close the circuit after reset timeout', async () => {
      const error = new Error('Test error');
      const fn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const wrappedFn = circuitBreaker(fn, { 
        failureThreshold: 2,
        resetTimeout: 1000
      });
      
      // First failure
      await expect(wrappedFn()).rejects.toThrow(error);
      
      // Second failure - should open the circuit
      await expect(wrappedFn()).rejects.toThrow(error);
      
      // Fast-forward time past the reset timeout
      jest.advanceTimersByTime(1001);
      
      // Circuit should be half-open now, allowing the next call
      const result = await wrappedFn();
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
