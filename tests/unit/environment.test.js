// Import the environment utilities
import { isDevelopment, isTest, isProduction, getEnvironment } from '../../utils/environment.js';

describe('Environment Utilities', () => {
  test('Environment functions exist', () => {
    expect(typeof isDevelopment).toBe('function');
    expect(typeof isTest).toBe('function');
    expect(typeof isProduction).toBe('function');
    expect(typeof getEnvironment).toBe('function');
  });

  test('isDevelopment returns a boolean', () => {
    const result = isDevelopment();
    expect(typeof result).toBe('boolean');
  });

  test('isTest returns a boolean', () => {
    const result = isTest();
    expect(typeof result).toBe('boolean');
  });

  test('isProduction returns a boolean', () => {
    const result = isProduction();
    expect(typeof result).toBe('boolean');
  });

  test('getEnvironment returns a string', () => {
    const result = getEnvironment();
    expect(typeof result).toBe('string');
  });
});
