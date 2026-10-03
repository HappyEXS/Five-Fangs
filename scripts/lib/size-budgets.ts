// Budżety rozmiaru builda (CLAUDE.md, docs/DEPLOY.md §4). Rozmiary w bajtach; KB i MB liczone po 1024.

export interface DistFileSize {
  /** Ścieżka względem dist/, z ukośnikami `/`. */
  path: string;
  raw: number;
  gzip: number;
}

export interface BudgetResult {
  id: 'js-gzip' | 'first-load' | 'world-atlas';
  label: string;
  bytes: number;
  limit: number;
  ok: boolean;
  /** Plik, którego dotyczy wynik, gdy budżet jest liczony per plik. */
  file: string | null;
}

const KB = 1024;
const MB = 1024 * KB;

export const JS_GZIP_LIMIT = 150 * KB;
export const FIRST_LOAD_LIMIT = 2 * MB;
export const WORLD_ATLAS_LIMIT = 1 * MB;

/** Hosting kompresuje tylko tekst; obrazy, fonty i dźwięk idą w rozmiarze z dysku. */
const COMPRESSIBLE = /\.(?:html|js|css|json|svg|txt)$/;

/**
 * Atlasy i tła światów nazywają się `world_<numer>...` (potok atlasów, M3-1).
 * Świat 1 ładuje się przy pierwszym uruchomieniu, kolejne leniwie.
 */
const WORLD_ASSET = /(?:^|\/)world_(\d+)[^/]*$/;

export function transferSize(file: DistFileSize): number {
  return COMPRESSIBLE.test(file.path) ? file.gzip : file.raw;
}

function worldNumber(path: string): number | null {
  const match = WORLD_ASSET.exec(path);
  return match?.[1] === undefined ? null : Number(match[1]);
}

export function evaluateBudgets(files: readonly DistFileSize[]): BudgetResult[] {
  // Source mapy pobiera tylko przeglądarka z otwartymi narzędziami deweloperskimi.
  const served = files.filter((file) => !file.path.endsWith('.map'));

  let jsGzip = 0;
  let firstLoad = 0;
  let largestWorld: DistFileSize | null = null;
  for (const file of served) {
    if (file.path.endsWith('.js')) jsGzip += file.gzip;
    const world = worldNumber(file.path);
    if (world === null || world === 1) firstLoad += transferSize(file);
    if (world !== null && (largestWorld === null || file.raw > largestWorld.raw)) {
      largestWorld = file;
    }
  }
  const worldBytes = largestWorld === null ? 0 : transferSize(largestWorld);

  return [
    {
      id: 'js-gzip',
      label: 'JS (gzip)',
      bytes: jsGzip,
      limit: JS_GZIP_LIMIT,
      ok: jsGzip <= JS_GZIP_LIMIT,
      file: null,
    },
    {
      id: 'first-load',
      label: 'Pierwsze uruchomienie (transfer)',
      bytes: firstLoad,
      limit: FIRST_LOAD_LIMIT,
      ok: firstLoad <= FIRST_LOAD_LIMIT,
      file: null,
    },
    {
      id: 'world-atlas',
      label: 'Największy plik świata',
      bytes: worldBytes,
      limit: WORLD_ATLAS_LIMIT,
      ok: worldBytes <= WORLD_ATLAS_LIMIT,
      file: largestWorld?.path ?? null,
    },
  ];
}

export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  return `${(bytes / KB).toFixed(1)} KB`;
}
