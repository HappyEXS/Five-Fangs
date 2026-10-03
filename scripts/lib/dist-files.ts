// Odczyt zawartości dist/ dla skryptów check:size i check:dist.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const TEXT_FILE = /\.(?:html|js|css|json|svg|txt|map)$/;

export interface DistFile {
  /** Ścieżka względem dist/, z ukośnikami `/`. */
  path: string;
  bytes: Buffer;
  isText: boolean;
}

function walk(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Wszystkie pliki z dist/ w kolejności alfabetycznej. Kończy proces, gdy builda nie ma. */
export function readDist(distDir: string): DistFile[] {
  if (!existsSync(distDir)) {
    console.error(`Brak katalogu ${distDir}. Najpierw uruchom: pnpm build`);
    process.exit(1);
  }
  return walk(distDir, [])
    .sort()
    .map((full) => {
      const path = relative(distDir, full).split(sep).join('/');
      return { path, bytes: readFileSync(full), isText: TEXT_FILE.test(path) };
    });
}
