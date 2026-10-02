import { defineConfig } from 'vitest/config';

// W kontenerze deweloperskim zdarzenia systemu plików z Windows nie docierają do Linuksa,
// więc obserwowanie zmian musi odpytywać dysk (compose.yaml ustawia FF_WATCH_POLLING).
const pollingWatch = process.env.FF_WATCH_POLLING === '1';

export default defineConfig({
  // Ścieżki względne: build działa pod dowolnym adresem (docs/DEPLOY.md).
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    watch: pollingWatch ? { usePolling: true, interval: 300 } : null,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
