# Sticker Application Tests

This directory contains tests for the Sticker application. The tests are organized into the following directories:

- `unit/`: Unit tests for individual components and utilities
- `integration/`: Integration tests for testing multiple components together
- `fixtures/`: Test data and fixtures
- `helpers/`: Helper functions and utilities for tests

## Running Tests

Tests can be run using the following npm scripts:

```bash
# Run all tests
npm test

# Run tests in watch mode (automatically re-run when files change)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run the application with tests in watch mode
npm run start:with-tests
```

## Test Environment

Tests are only run in development mode. In production mode (packaged application), tests are automatically skipped.

The test environment is configured in `tests/setup.js` and uses Jest as the test runner.

## Writing Tests

When writing tests, follow these guidelines:

1. Place unit tests in the `unit/` directory
2. Place integration tests in the `integration/` directory
3. Use descriptive test names
4. Group related tests using `describe` blocks
5. Use `beforeEach` and `afterEach` for setup and teardown
6. Clean up any resources created during tests

## Test Utilities

The following utilities are available for testing:

- `environment.js`: Utilities for detecting the current environment (development, test, production)
- `test-loader.js`: Utility for conditionally loading and running tests

## Debugging Tests

To debug tests, you can:

1. Add `console.log` statements to your tests
2. Use the `--verbose` flag: `npm test -- --verbose`
3. Run a specific test: `npm test -- -t "test name"`
