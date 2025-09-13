module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  env: {
    node: true,
    es2021: true,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    'controllers/**/*',
    'routes/**/*',
    'scripts/**/*',
    'tests/**/*',
    'seed.ts',
  ],
  rules: {
    'prettier/prettier': 'error',
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    indent: ['error', 2],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
