module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    esmodules: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      modules: true
    }
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    // TypeScript specific
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    
    // General best practices
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'no-unused-vars': 'off', // Handled by @typescript-eslint
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Code style
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],
    
    // Complexity
    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
    'max-depth': ['warn', 4],
    'max-params': ['warn', 5],
    
    // Imports
    'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }],
    
    // Disabled for this codebase
    'no-empty-function': 'off',
    'no-empty-pattern': 'off'
  },
  overrides: [
    {
      files: ['*.config.js', 'vite.config.js', '.eslintrc.js'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off'
      }
    },
    {
      files: ['tests/*.mjs'],
      env: { jest: true },
      rules: {
        'no-console': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.min.js',
    '*.map',
    'backup/',
    'temp_*.cjs',
    'graph.html',
    'fluxograma.html',
    '*.sqlite',
    '*.sqlite-*'
  ]
};