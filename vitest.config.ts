import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws when imported outside Next's server runtime; tests run server code directly.
      'server-only': fileURLToPath(new URL('./src/lib/__tests__/server-only-stub.ts', import.meta.url)),
    },
  },
});
