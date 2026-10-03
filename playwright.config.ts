// Testy end-to-end na buildzie produkcyjnym serwowanym przez `vite preview` (te same nagłówki
// i CSP co na hostingu). Wymagają wcześniejszego `pnpm build`.
//
//   pnpm e2e:install   pobiera przeglądarkę (raz)
//   pnpm test:e2e
import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  // Walka testowa trwa kilkanaście sekund gry; zapas na wolne maszyny CI.
  timeout: 120_000,
  forbidOnly: process.env.CI !== undefined,
  retries: 0,
  reporter: process.env.CI !== undefined ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1280, height: 720 },
    locale: 'pl-PL',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `pnpm preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/version.json`,
    reuseExistingServer: process.env.CI === undefined,
  },
});
