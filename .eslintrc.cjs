module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:prettier/recommended'
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'import/no-unresolved': 'off'
  }
};
