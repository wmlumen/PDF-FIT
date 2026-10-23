/** @type {import('eslint').Linter.Config} */
const config = {
  files: ['**/*.{js,mjs,cjs}'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
    },
    parser: '@typescript-eslint/parser',
  },
  plugins: {
    '@typescript-eslint': {
      enable: true,
      rules: {},
    },
  },
  settings: {
    typescript: {
      project: './tsconfig.json',
    },
  },
  rules: {
    // TypeScript specific
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',

    // General best practices
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
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
    'no-empty-pattern': 'off',
  },
  ignores: [
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
    '*.sqlite-*',
  ],
};

export default config;