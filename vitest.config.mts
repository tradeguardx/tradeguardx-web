import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    // Tests must not depend on a developer's .env.local (CI has none). Without
    // these, supabase-js throws "supabaseUrl is required" when
    // src/lib/supabaseClient.js is imported, and every file that imports it
    // fails to load. The values are dummies on purpose: no test may reach a
    // real Supabase project, so they also override a local .env.local.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
