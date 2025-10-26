module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  moduleDirectories: ['node_modules', '<rootDir>/backend/node_modules'],
  modulePathIgnorePatterns: ['<rootDir>/WorkPro3/'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setupEnv.ts'],
  globalSetup: '<rootDir>/tests/integration/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.ts',
  moduleNameMapper: {
    '^backend/server$': '<rootDir>/tests/integration/stubs/server.ts',
    '^\.\./server$': '<rootDir>/tests/integration/stubs/server.ts',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        diagnostics: false,
        isolatedModules: false,
      },
    ],
  },
};
