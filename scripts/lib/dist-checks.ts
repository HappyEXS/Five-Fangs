// Test czystości dist/: komplet plików, brak kodu deweloperskiego, brak zewnętrznych adresów.
import { DEBUG_MARKER, DEV_TOOLS_MARKER } from '../../src/core/dev-markers.ts';

export interface DistTextFile {
  /** Ścieżka względem dist/, z ukośnikami `/`. */
  path: string;
  /** Treść pliku tekstowego albo null dla pliku binarnego. */
  text: string | null;
}

const FORBIDDEN_MARKERS = [DEV_TOOLS_MARKER, DEBUG_MARKER];

function versionProblems(text: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return ['version.json nie jest poprawnym JSON-em'];
  }
  if (typeof parsed !== 'object' || parsed === null) return ['version.json nie jest obiektem'];
  const record: Record<string, unknown> = { ...parsed };
  const problems: string[] = [];
  for (const field of ['version', 'commit', 'builtAt']) {
    const value = record[field];
    if (typeof value !== 'string' || value === '') {
      problems.push(`version.json: brak pola "${field}"`);
    }
  }
  return problems;
}

function htmlProblems(path: string, html: string): string[] {
  const problems: string[] = [];
  for (const match of html.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/g)) {
    const url = match[2] ?? '';
    // base './' wymaga ścieżek względnych; adres zewnętrzny łamie zasadę zera obcych domen.
    if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(url) && !url.startsWith('data:')) {
      problems.push(`${path}: adres nie jest względny: "${url}"`);
    }
  }
  return problems;
}

/** Lista problemów w zawartości dist/; pusta oznacza poprawny build. */
export function checkDist(files: readonly DistTextFile[]): string[] {
  const problems: string[] = [];
  const paths = files.map((file) => file.path);

  if (!paths.includes('index.html')) problems.push('brak index.html');
  if (!paths.includes('version.json')) problems.push('brak version.json');
  if (!paths.some((path) => /^assets\/.+\.js$/.test(path)))
    problems.push('brak plików JS w assets/');

  for (const file of files) {
    if (/tools/i.test(file.path)) {
      problems.push(`${file.path}: plik narzędzi dev w buildzie produkcyjnym`);
    }
    if (file.text === null) continue;
    // Source mapy zawierają oryginalne źródła, w tym gałęzie usunięte z kodu wynikowego.
    if (!file.path.endsWith('.map')) {
      for (const marker of FORBIDDEN_MARKERS) {
        if (file.text.includes(marker)) {
          problems.push(`${file.path}: znacznik kodu deweloperskiego "${marker}"`);
        }
      }
    }
    if (file.path.endsWith('.html')) problems.push(...htmlProblems(file.path, file.text));
    if (file.path === 'version.json') problems.push(...versionProblems(file.text));
  }
  return problems;
}
