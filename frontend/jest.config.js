/**
 * Unit tests for helpers and client components (jsdom). Pages and server
 * actions need the backend and are covered by the backend e2e tests.
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', module: 'commonjs', esModuleInterop: true, isolatedModules: true } }],
  },
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/__tests__/style-stub.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
