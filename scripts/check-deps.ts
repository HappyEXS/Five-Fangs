// pnpm deps:check – granice modułów i czystość symulacji dla wszystkich plików w src/.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { checkImports, checkSimPurity, type Violation } from './lib/module-boundaries.ts';

const root = process.cwd();

function listSources(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listSources(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = listSources(join(root, 'src'), []).sort();
const violations: Violation[] = [];
for (const full of files) {
  const file = relative(root, full).split(sep).join('/');
  const source = readFileSync(full, 'utf8');
  violations.push(...checkImports(file, source), ...checkSimPurity(file, source));
}

if (violations.length > 0) {
  for (const v of violations) console.error(`${v.file}:${v.line}  ${v.message}`);
  console.error(`\nNaruszenia granic modułów: ${violations.length}`);
  process.exit(1);
}
console.log(`Granice modułów: OK (${files.length} plików)`);
