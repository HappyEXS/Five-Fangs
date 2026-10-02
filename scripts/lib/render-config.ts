// Odczyt reguł z render.yaml i public/_headers. Oba pliki muszą opisywać te same nagłówki
// (CLAUDE.md, sekcja Deploy); test porównuje je przy każdym uruchomieniu.
// Parser YAML jest celowo minimalny: rozumie tylko układ używany w naszym render.yaml.

export interface HeaderRule {
  path: string;
  name: string;
  value: string;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function unquote(value: string): string {
  const v = value.trim();
  const first = v[0];
  if (v.length >= 2 && (first === '"' || first === "'") && v.endsWith(first)) return v.slice(1, -1);
  return v;
}

/** Linie bloku pod kluczem `key:` (głębiej wcięte niż sam klucz), bez pustych i komentarzy. */
function blockUnder(yaml: string, key: string): string[] {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) return [];
  const base = indentOf(lines[start] ?? '');
  const block: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    if (indentOf(line) <= base && !trimmed.startsWith('- ')) break;
    if (indentOf(line) < base) break;
    block.push(trimmed);
  }
  return block;
}

/** Reguły nagłówków z sekcji `headers:` w render.yaml. */
export function parseRenderHeaders(yaml: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let current: Partial<HeaderRule> = {};
  const flush = (): void => {
    if (current.path !== undefined && current.name !== undefined && current.value !== undefined) {
      rules.push({ path: current.path, name: current.name, value: current.value });
    }
    current = {};
  };
  for (const raw of blockUnder(yaml, 'headers')) {
    const startsItem = raw.startsWith('- ');
    if (startsItem) flush();
    const line = startsItem ? raw.slice(2) : raw;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = unquote(line.slice(colon + 1));
    if (key === 'path' || key === 'name' || key === 'value') current[key] = value;
  }
  flush();
  return rules;
}

/** Wzorce z `buildFilter.ignoredPaths` w render.yaml. */
export function parseIgnoredPaths(yaml: string): string[] {
  return blockUnder(yaml, 'ignoredPaths')
    .filter((line) => line.startsWith('- '))
    .map((line) => unquote(line.slice(2)));
}

/** Reguły z pliku `_headers` (format Cloudflare Pages / Netlify). */
export function parseHeadersFile(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let path: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    if (indentOf(line) === 0) {
      path = trimmed;
      continue;
    }
    const colon = trimmed.indexOf(':');
    if (path === null || colon === -1) continue;
    rules.push({
      path,
      name: trimmed.slice(0, colon).trim(),
      value: trimmed.slice(colon + 1).trim(),
    });
  }
  return rules;
}

/** Nagłówki, które reguły przypisują do danej ścieżki; nazwy małymi literami. */
export function headersForPath(
  rules: readonly HeaderRule[],
  requestPath: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const rule of rules) {
    if (headerPathMatches(rule.path, requestPath)) headers[rule.name.toLowerCase()] = rule.value;
  }
  return headers;
}

/**
 * Dopasowanie ścieżki reguły nagłówka. W regułach nagłówków `*` obejmuje także ukośniki
 * (`/*` to wszystkie ścieżki), inaczej niż we wzorcach plików z `buildFilter`.
 */
export function headerPathMatches(rulePath: string, requestPath: string): boolean {
  const source = rulePath
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}$`).test(requestPath);
}

/** Wzorzec pliku z `buildFilter`: `**` dowolny ciąg wraz z ukośnikami, `*` dowolny ciąg bez ukośnika. */
export function globToRegExp(glob: string): RegExp {
  let source = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i] ?? '';
    if (ch === '*' && glob[i + 1] === '*') {
      // `**/` pasuje też do zera katalogów, żeby `**/*.md` obejmowało pliki w katalogu głównym.
      if (glob[i + 2] === '/') {
        source += '(?:.*/)?';
        i += 2;
      } else {
        source += '.*';
        i += 1;
      }
    } else if (ch === '*') {
      source += '[^/]*';
    } else {
      source += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
}

/** Czy wszystkie zmienione pliki pasują do wzorców ignorowanych (deploy zostanie pominięty). */
export function allIgnored(
  changedFiles: readonly string[],
  ignoredGlobs: readonly string[],
): boolean {
  if (changedFiles.length === 0) return false;
  const patterns = ignoredGlobs.map(globToRegExp);
  return changedFiles.every((file) => patterns.some((pattern) => pattern.test(file)));
}
