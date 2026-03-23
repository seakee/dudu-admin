module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
    'vue/setup-compiler-macros': true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    extraFileExtensions: ['.vue']
  },
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    'tmp/**',
    'src/types/**/*.d.ts'
  ],
  rules: {
    'no-undef': 'off',
    'no-irregular-whitespace': 'off',
    'no-console': 'off',
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  }
}
