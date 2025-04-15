export default {
  "env": {
    "browser": true,
    "es2021": true,
    "node": true,
    "jest": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:prettier/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    // Error prevention
    "no-var": "error",
    "prefer-const": "error",
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
    "no-debugger": "warn",
    
    // Code style
    "indent": ["error", 2, { "SwitchCase": 1 }],
    "linebreak-style": ["error", "windows"],
    "quotes": ["error", "single", { "avoidEscape": true, "allowTemplateLiterals": true }],
    "semi": ["error", "always"],
    "comma-dangle": ["error", "never"],
    "arrow-parens": ["error", "as-needed"],
    
    // ES Modules
    "import/extensions": "off",
    
    // Async/await
    "require-await": "error",
    
    // Prettier integration
    "prettier/prettier": ["error", {
      "singleQuote": true,
      "trailingComma": "none",
      "endOfLine": "crlf",
      "printWidth": 100,
      "tabWidth": 2
    }]
  },
  "ignorePatterns": [
    "node_modules/",
    "dist/",
    "*.min.js"
  ]
}
