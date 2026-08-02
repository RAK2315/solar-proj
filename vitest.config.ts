import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * THE TESTS RUN IN TEST MODE, EVEN INSIDE A PRODUCTION BUILD.
 *
 * `prebuild` runs this suite, and Vercel sets NODE_ENV=production for the entire
 * build — so vitest inherited it. Vitest only DEFAULTS NODE_ENV to 'test' when it
 * is unset; it does not override a value that is already there. React and React DOM
 * then resolved their production bundles, in which `act` does not exist, because it
 * is a development-only export. Every rendering test died with
 * `TypeError: React.act is not a function` and the deploy failed.
 *
 * Nothing was wrong with the tests: the same suite passes locally, where NODE_ENV is
 * unset. Reproduce it with `NODE_ENV=production npx vitest run`.
 *
 * Set before defineConfig so vite has it when it resolves export conditions. This
 * does not leak into `next build`, which runs as a separate process afterwards.
 */
// Cast because @types/node declares NODE_ENV read-only, and `next build` typechecks
// this file too. The assignment is the point; the type is protecting the wrong thing.
(process.env as Record<string, string>).NODE_ENV = 'test';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Must match tsconfig paths exactly. If these drift, components and tests
      // end up importing two different copies of the store — which silently makes
      // every clock-driven assertion pass against a store nobody is writing to.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@data': fileURLToPath(new URL('./data', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // The cinematic tests render the console TWICE (once standalone, once as the
    // PiP inside the cinematic). That is the point of them, and it is not fast.
    testTimeout: 20000,
  },
});
