import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Stamp the service worker with the current build time on every production
// build so the activate handler always evicts the previous cache version.
function swVersionPlugin() {
  return {
    name: 'sw-version',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js');
      try {
        let sw = readFileSync(swPath, 'utf-8');
        sw = sw.replace(
          /const CACHE_NAME = 'gba-quest-[^']*';/,
          `const CACHE_NAME = 'gba-quest-${Date.now()}';`
        );
        writeFileSync(swPath, sw);
      } catch {
        // sw.js not present (e.g. dev mode) — skip silently.
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  resolve: {
    // Force all packages (including @supabase/supabase-js transitive deps) to
    // resolve to the same React instance. Without this, Vite may create a
    // second React copy after new packages are installed, breaking hook calls.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@thenick775/mgba-wasm'],
  },
});
