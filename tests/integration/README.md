# Integration Tests for FloatingStickers

This directory contains integration tests for the FloatingStickers application. These tests verify end-to-end functionality for key user workflows.

## Test Structure

The tests are organized by feature:

- `create-sticker.spec.js`: Tests for creating new stickers
- `edit-sticker.spec.js`: Tests for editing sticker content
- `sticker-positioning.spec.js`: Tests for moving and resizing stickers
- `sticker-persistence.spec.js`: Tests for sticker data persistence across app restarts
- `sticker-styling.spec.js`: Tests for sticker styling and appearance
- `error-handling.spec.js`: Tests for error handling and recovery

## Running Tests

To run the integration tests:

```bash
npm run test:integration
```

To run the tests with the Playwright UI:

```bash
npm run test:integration:ui
```

## Test Helpers

The `helpers/electron-helper.js` file contains utility functions for common operations:

- Launching the Electron app
- Creating stickers
- Editing sticker content
- Moving and resizing stickers
- Getting sticker properties
- Deleting stickers

## Configuration

The test configuration is defined in `playwright.config.js` in the project root.

## Notes

- These tests run against the actual Electron application, not a mock
- Tests are designed to be independent and can be run in isolation
- Some tests may modify the application's data files
- Error handling tests may require specific permissions to run correctly
