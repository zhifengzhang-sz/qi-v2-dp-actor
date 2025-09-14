import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import qiPlugin from '@qi/eslint-plugin'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@qi': qiPlugin
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      }
    }
  },
  {
    // DSL strict rules - applies to lib/dsl/**
    files: ['lib/dsl/src/**/*.ts'],
    rules: {
      '@qi/no-result-anti-patterns': 'error',
      '@qi/no-throw-in-dsl': 'error',
      '@qi/enforce-readonly-dsl': 'error',
      '@qi/no-imperative-try-catch': ['error', {
        enforcePaths: ['**/lib/dsl/**'],
        allowTestFiles: true
      }]
    }
  },
  {
    // Actor rules - applies to lib/actors/**
    files: ['lib/actors/src/**/*.ts'],
    rules: {
      '@qi/no-result-anti-patterns': 'error',
      '@qi/no-imperative-try-catch': ['error', {
        enforcePaths: ['**/lib/actors/**'],
        allowTestFiles: true
      }]
    }
  },
  {
    // Utilities rules - applies to lib/utils/**
    files: ['lib/utils/src/**/*.ts'],
    rules: {
      '@qi/no-result-anti-patterns': 'error',
      '@qi/no-imperative-try-catch': ['error', {
        enforcePaths: ['**/lib/utils/**'],
        allowTestFiles: true
      }]
    }
  },
  {
    // Base infrastructure rules - applies to lib/base/**
    files: ['lib/base/src/**/*.ts'],
    rules: {
      '@qi/no-result-anti-patterns': 'error',
      '@qi/no-imperative-try-catch': ['error', {
        enforcePaths: ['**/lib/base/**'],
        allowTestFiles: true
      }]
    }
  },
  {
    // Generic actors rules - applies to lib/generic/**
    files: ['lib/generic/src/**/*.ts'],
    rules: {
      '@qi/no-result-anti-patterns': 'error',
      '@qi/no-imperative-try-catch': ['error', {
        enforcePaths: ['**/lib/generic/**'],
        allowTestFiles: true
      }]
    }
  },
  {
    // MCP actors rules - applies to lib/mcp/**
    files: ['lib/mcp/src/**/*.ts'],
    rules: {
      '@qi/no-result-anti-patterns': 'error',
      '@qi/no-imperative-try-catch': ['error', {
        enforcePaths: ['**/lib/mcp/**'],
        allowTestFiles: true
      }]
    }
  },
  {
    // Test files - more lenient
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
    rules: {
      '@qi/no-throw-in-dsl': 'off',
      '@qi/no-imperative-try-catch': 'off'
    }
  },
  {
    // Ignore certain files/directories
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.d.ts',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      'lib/*/dist/**',
      'lib/*/node_modules/**'
    ]
  }
)