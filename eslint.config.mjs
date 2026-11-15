import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/**', 'data/db.json', 'public/assets/vendor/**']
  },
  js.configs.recommended,
  {
    rules: {
      // les blocs catch vides sont volontaires (stockage indisponible, etc.)
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }]
    }
  },
  {
    files: ['server/**/*.js', 'data/**/*.js', 'server.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
        exports: 'writable',
        Buffer: 'readonly'
      }
    }
  },
  {
    files: ['tests/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        Buffer: 'readonly'
      }
    }
  },
  {
    files: ['public/assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        location: 'readonly',
        history: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        caches: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        requestAnimationFrame: 'readonly',
        Intl: 'readonly',
        alert: 'readonly',
        print: 'readonly'
      }
    }
  }
];
