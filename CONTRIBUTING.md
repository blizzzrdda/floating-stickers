# Contributing to FloatingStickers

Thank you for your interest in contributing to the FloatingStickers project! This document outlines the coding standards and guidelines to follow when contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/floating-stickers.git`
3. Install dependencies: `npm install`
4. Run the application: `npm start`

## Development Workflow

1. Create a new branch for your feature or bugfix: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run linting and formatting: `npm run lint:fix && npm run format`
4. Run tests: `npm test`
5. Commit your changes with a descriptive commit message
6. Push to your fork and submit a pull request

## Coding Standards

We use ESLint and Prettier to enforce coding standards. You can run the following commands:

- `npm run lint`: Check for linting issues
- `npm run lint:fix`: Fix linting issues automatically
- `npm run format`: Format code using Prettier
- `npm run format:check`: Check if code is properly formatted

### JavaScript Guidelines

- Use ES modules (import/export) instead of CommonJS (require/module.exports)
- Use `const` for variables that don't need to be reassigned, `let` otherwise
- Avoid using `var`
- Use async/await for asynchronous code instead of callbacks or promise chains
- Use meaningful variable and function names
- Add JSDoc comments for functions and classes

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons at the end of statements
- Maximum line length is 100 characters
- No trailing commas
- Windows-style line endings (CRLF)

### File Organization

- Place utility functions in the `utils/` directory
- Place UI components in the `ui/` directory
- Place services in the `services/` directory
- Place tests in the `tests/` directory

## Testing

We use Jest for testing. All new features should include tests. Run tests with:

- `npm test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage report

## Pull Request Process

1. Ensure your code follows the coding standards
2. Update documentation if necessary
3. Include tests for new features
4. Make sure all tests pass
5. Your pull request will be reviewed by maintainers

## License

By contributing to FloatingStickers, you agree that your contributions will be licensed under the project's MIT License.
