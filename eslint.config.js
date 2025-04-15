import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable'
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      // Error prevention
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'warn',

      // Code style
      'indent': ['error', 2, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'windows'],
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],

      // Async/await
      'require-await': 'error'
    },
    ignores: [
      'node_modules/**',
      'dist/**',
      '**/*.min.js'
    ]
  }
];
