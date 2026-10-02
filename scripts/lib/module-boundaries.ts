// Reguły granic modułów z CLAUDE.md oraz zakazane API w symulacji.
// Własna implementacja zamiast dependency-cruiser: ADR 0012.

export type Layer =
  | 'core'
  | 'sim'
  | 'content'
  | 'render'
  | 'game'
  | 'ui'
  | 'tools'
  | 'assets'
  | 'entry'
  | 'toolsEntry';

export interface ImportRef {
  specifier: string;
  typeOnly: boolean;
  line: number;
}

export interface Violation {
  file: string;
  line: number;
  message: string;
}

const SOURCE_LAYERS: readonly Layer[] = ['core', 'sim', 'content', 'render', 'game', 'ui', 'tools'];

/** Warstwy, z których dana warstwa może importować wartości (poza samą sobą). */
const ALLOWED_LAYERS: Record<Layer, readonly Layer[]> = {
  core: [],
  sim: ['core'],
  content: ['core'],
  render: ['core', 'sim', 'content', 'assets'],
  game: ['core', 'sim', 'content', 'render', 'assets'],
  ui: ['core', 'content', 'game', 'assets'],
  tools: ['core', 'sim', 'content', 'render', 'game', 'ui', 'assets'],
  assets: [],
  entry: ['core', 'sim', 'content', 'render', 'game', 'ui', 'assets'],
  toolsEntry: ['core', 'sim', 'content', 'render', 'game', 'ui', 'tools', 'assets'],
};

/** Dodatkowe warstwy dozwolone wyłącznie przez `import type`. */
const ALLOWED_TYPE_ONLY: Partial<Record<Layer, readonly Layer[]>> = {
  content: ['sim'],
};

/** Pakiety zewnętrzne dozwolone w warstwie; `*` oznacza dowolne. */
const ALLOWED_PACKAGES: Record<Layer, readonly string[]> = {
  core: [],
  sim: [],
  content: ['zod'],
  render: [],
  game: ['zod', '@preact/signals'],
  ui: ['preact', '@preact/signals'],
  tools: ['*'],
  assets: [],
  entry: ['preact', '@preact/signals'],
  toolsEntry: ['*'],
};

const TEST_FILE = /\.test\.tsx?$/;

/** Zamienia komentarze na spacje, zachowując znaki nowej linii i treść napisów. */
export function stripComments(source: string): string {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      while (i < stop) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
    } else if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      out += ch;
      i++;
      while (i < n && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < n) {
          out += source[i];
          i++;
        }
        out += source[i];
        i++;
      }
      if (i < n) {
        out += source[i];
        i++;
      }
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

const STATIC_FROM = /\b(import|export)\s+(type\s+)?(?:[^'"();]*?)\bfrom\s*(['"])([^'"\n]+)\3/g;
const SIDE_EFFECT = /\bimport\s*(['"])([^'"\n]+)\1/g;
const DYNAMIC_LITERAL = /\bimport\s*\(\s*(['"])([^'"\n]+)\1/g;
const DYNAMIC_ANY = /\bimport\s*\(\s*(?!['"])/g;

/** Wszystkie importy i reeksporty pliku. Dynamiczny import bez literału ma pusty specifier. */
export function extractImports(source: string): ImportRef[] {
  const text = stripComments(source);
  const refs: ImportRef[] = [];
  for (const m of text.matchAll(STATIC_FROM)) {
    refs.push({ specifier: m[4] ?? '', typeOnly: m[2] !== undefined, line: lineOf(text, m.index) });
  }
  for (const m of text.matchAll(SIDE_EFFECT)) {
    refs.push({ specifier: m[2] ?? '', typeOnly: false, line: lineOf(text, m.index) });
  }
  for (const m of text.matchAll(DYNAMIC_LITERAL)) {
    refs.push({ specifier: m[2] ?? '', typeOnly: false, line: lineOf(text, m.index) });
  }
  for (const m of text.matchAll(DYNAMIC_ANY)) {
    refs.push({ specifier: '', typeOnly: false, line: lineOf(text, m.index) });
  }
  return refs.sort((a, b) => a.line - b.line);
}

/** Warstwa pliku o ścieżce względem katalogu repozytorium (ukośniki `/`), albo null poza `src/`. */
export function layerOf(path: string): Layer | null {
  const parts = path.split('/');
  if (parts[0] !== 'src') return null;
  if (parts.length === 2) return parts[1] === 'tools.ts' ? 'toolsEntry' : 'entry';
  const dir = parts[1];
  if (dir === 'assets') return 'assets';
  for (const layer of SOURCE_LAYERS) {
    if (layer === dir) return layer;
  }
  return null;
}

function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function resolveRelative(fromFile: string, specifier: string): string {
  const clean = specifier.replace(/[?#].*$/, '');
  if (clean.startsWith('/')) return normalize(clean);
  const dir = fromFile.slice(0, Math.max(0, fromFile.lastIndexOf('/')));
  return normalize(`${dir}/${clean}`);
}

function packageName(specifier: string): string {
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) return `${parts[0] ?? ''}/${parts[1] ?? ''}`;
  return parts[0] ?? '';
}

/** Naruszenia granic modułów w jednym pliku. */
export function checkImports(file: string, source: string): Violation[] {
  const layer = layerOf(file);
  if (layer === null) return [];
  const isTest = TEST_FILE.test(file);
  const violations: Violation[] = [];

  for (const ref of extractImports(source)) {
    if (ref.specifier === '') {
      if (layer !== 'tools' && layer !== 'toolsEntry') {
        violations.push({
          file,
          line: ref.line,
          message:
            'dynamiczny import musi mieć literał jako ścieżkę, inaczej nie da się go sprawdzić',
        });
      }
      continue;
    }

    const relative = ref.specifier.startsWith('.') || ref.specifier.startsWith('/');
    if (!relative) {
      const isBuiltin = ref.specifier.startsWith('node:');
      const name = isBuiltin ? ref.specifier : packageName(ref.specifier);
      const allowed = ALLOWED_PACKAGES[layer];
      const ok =
        allowed.includes('*') ||
        allowed.includes(name) ||
        (isTest && (name === 'vitest' || isBuiltin));
      if (!ok) {
        violations.push({
          file,
          line: ref.line,
          message: `warstwa "${layer}" nie może importować pakietu "${name}"`,
        });
      }
      continue;
    }

    const target = resolveRelative(file, ref.specifier);
    const targetLayer = layerOf(target);
    if (targetLayer === null) {
      violations.push({
        file,
        line: ref.line,
        message: `import spoza src/ albo z nieznanego katalogu: "${ref.specifier}"`,
      });
      continue;
    }
    if (targetLayer === layer) continue;
    if (ALLOWED_LAYERS[layer].includes(targetLayer)) continue;
    if (ref.typeOnly && (ALLOWED_TYPE_ONLY[layer] ?? []).includes(targetLayer)) continue;

    const typeHint = (ALLOWED_TYPE_ONLY[layer] ?? []).includes(targetLayer)
      ? ' (dozwolony tylko `import type`)'
      : '';
    violations.push({
      file,
      line: ref.line,
      message: `warstwa "${layer}" nie może importować z "${targetLayer}"${typeHint}: "${ref.specifier}"`,
    });
  }
  return violations;
}

const BANNED_IN_SIM: readonly { pattern: RegExp; reason: string }[] = [
  { pattern: /\bMath\s*\.\s*random\b/g, reason: 'sim nie używa losowości' },
  { pattern: /\bDate\s*\.\s*now\b|\bnew\s+Date\b/g, reason: 'sim nie zna zegara' },
  { pattern: /\bperformance\s*\.\s*\w+/g, reason: 'sim nie zna zegara' },
  {
    pattern:
      /\bMath\s*\.\s*(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|exp|expm1|log|log2|log10|log1p|pow|sqrt|cbrt|hypot|fround)\b/g,
    reason: 'funkcja zmiennoprzecinkowa lub przestępna',
  },
  { pattern: /\*\*/g, reason: 'potęgowanie jest zakazane' },
  { pattern: /\bFloat(32|64)Array\b/g, reason: 'stan sim jest całkowitoliczbowy' },
];

/** Użycia API zakazanych w `src/sim` (ADR 0002). */
export function checkSimPurity(file: string, source: string): Violation[] {
  if (layerOf(file) !== 'sim') return [];
  const text = stripComments(source);
  const violations: Violation[] = [];
  for (const { pattern, reason } of BANNED_IN_SIM) {
    for (const m of text.matchAll(pattern)) {
      violations.push({ file, line: lineOf(text, m.index), message: `${m[0]}: ${reason}` });
    }
  }
  return violations.sort((a, b) => a.line - b.line);
}
