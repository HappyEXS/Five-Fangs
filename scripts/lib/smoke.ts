// Ocena odpowiedzi wdrożonej strony (docs/DEPLOY.md §5–6). Czysta logika; zapytania
// wykonuje scripts/smoke-check.ts.
import { type HeaderRule, headersForPath } from './render-config.ts';

export interface ProbeResponse {
  status: number;
  /** Nagłówki odpowiedzi z nazwami małymi literami. */
  headers: Readonly<Record<string, string>>;
}

export interface SmokeInput {
  expectedCommit: string;
  rules: readonly HeaderRule[];
  index: ProbeResponse;
  version: ProbeResponse;
  versionBody: string;
  /** Ścieżka pierwszego pliku JS z index.html, np. `/assets/index-abc.js`. */
  assetPath: string | null;
  asset: ProbeResponse | null;
  /** Odpowiedź na ścieżkę, której na pewno nie ma. */
  missing: ProbeResponse;
}

/** Ścieżka pierwszego skryptu z `assets/` w index.html, z ukośnikiem na początku. */
export function findAssetPath(indexHtml: string): string | null {
  const match = /\bsrc\s*=\s*["'](?:\.\/|\/)?(assets\/[^"']+\.js)["']/.exec(indexHtml);
  return match?.[1] === undefined ? null : `/${match[1]}`;
}

/** Skrót commita z treści version.json albo null, gdy treść jest nieczytelna. */
export function readCommit(versionBody: string): string | null {
  try {
    const parsed: unknown = JSON.parse(versionBody);
    if (typeof parsed === 'object' && parsed !== null && 'commit' in parsed) {
      return typeof parsed.commit === 'string' ? parsed.commit : null;
    }
  } catch {
    // Zła treść (np. strona błędu hostingu) to po prostu brak commita.
  }
  return null;
}

function headerProblems(
  path: string,
  response: ProbeResponse,
  rules: readonly HeaderRule[],
): string[] {
  const problems: string[] = [];
  if (response.status !== 200) problems.push(`${path}: status ${response.status} zamiast 200`);
  for (const [name, expected] of Object.entries(headersForPath(rules, path))) {
    const actual = response.headers[name];
    if (actual === undefined) {
      problems.push(`${path}: brak nagłówka ${name}`);
    } else if (actual.trim() !== expected) {
      problems.push(`${path}: nagłówek ${name} ma wartość "${actual}" zamiast "${expected}"`);
    }
  }
  return problems;
}

/** Lista problemów wdrożenia; pusta oznacza poprawny deploy. */
export function checkSmoke(input: SmokeInput): string[] {
  const problems: string[] = [];

  problems.push(...headerProblems('/', input.index, input.rules));
  problems.push(...headerProblems('/version.json', input.version, input.rules));

  const commit = readCommit(input.versionBody);
  if (commit !== input.expectedCommit) {
    problems.push(
      `/version.json: commit "${commit ?? 'nieczytelny'}" zamiast "${input.expectedCommit}"`,
    );
  }

  if (input.assetPath === null || input.asset === null) {
    problems.push('/: index.html nie odwołuje się do żadnego skryptu z assets/');
  } else {
    problems.push(...headerProblems(input.assetPath, input.asset, input.rules));
    if (input.asset.headers['content-encoding'] === undefined) {
      problems.push(`${input.assetPath}: odpowiedź nie jest skompresowana`);
    }
  }

  // Reguła rewrite „wszystko → index.html” maskowałaby brakujące pliki odpowiedzią 200.
  if (input.missing.status !== 404) {
    problems.push(`brakujący plik zwraca status ${input.missing.status} zamiast 404`);
  }
  return problems;
}
