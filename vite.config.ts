import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { type BuildVersion, createBuildVersion } from './scripts/lib/build-version.ts';

// W kontenerze deweloperskim zdarzenia systemu plików z Windows nie docierają do Linuksa,
// więc obserwowanie zmian musi odpytywać dysk (compose.yaml ustawia FF_WATCH_POLLING).
const pollingWatch = process.env.FF_WATCH_POLLING === '1';

function readPackageVersion(): string {
  const pkg: unknown = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  if (typeof pkg === 'object' && pkg !== null && 'version' in pkg) {
    const { version } = pkg;
    if (typeof version === 'string') return version;
  }
  throw new Error('package.json has no version');
}

function readGitHead(): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

const buildVersion = createBuildVersion(readPackageVersion(), process.env, readGitHead, new Date());

/** Zapisuje dist/version.json; gra porównuje go ze swoją wersją, żeby wykryć nowy deploy. */
function versionJson(build: BuildVersion): Plugin {
  return {
    name: 'five-fangs:version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify(build, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  // Ścieżki względne: build działa pod dowolnym adresem (docs/DEPLOY.md).
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion.version),
    __APP_COMMIT__: JSON.stringify(buildVersion.commit),
    __APP_BUILT_AT__: JSON.stringify(buildVersion.builtAt),
  },
  plugins: [versionJson(buildVersion)],
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
