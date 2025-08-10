// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nodejsPlugin from 'eslint-plugin-n';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      'n': nodejsPlugin,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_' 
      }],
      
      // Socket.IO best practices (using standard ESLint rules)
      'no-unused-expressions': 'error',
      'no-undef': 'error',
      
      // Node.js specific rules
      'n/no-deprecated-api': 'warn',
      'n/no-missing-import': 'off', // TypeScript handles this
      'n/no-unpublished-import': 'off', // TypeScript handles this
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
      'curly': ['error', 'all'],
      'no-var': 'error',
    }
  }
);
