// pnpm balance:heroes – pomiar balansu bohaterów: pojedynki form tego samego stopnia, wartość
// w drużynie i walki drużyn szczepów; raport w reports/heroes.md (ADR 0024). Po zmianie liczb
// bohaterów uruchom i porównaj raport z poprzednim commitem (git diff reports/).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pl from '../src/content/i18n/pl.json' with { type: 'json' };
import { requireContent } from '../src/content/load.ts';
import { formatHeroReport, HUMAN_SQUADS, SKETCH_SQUADS, squadMatrix } from './lib/hero-balance.ts';

const content = requireContent();
const text = pl as Record<string, string>;
const names = {
  unit: (id: string): string => text[`unit.${id}.name`] ?? id,
  // Mieszana drużyna ludzi nie jest szczepem, więc nie ma nazwy w słowniku gry.
  tribe: (id: string): string =>
    id === 'humans' ? 'Ludzie (mieszana)' : (text[`line.${id}.name`] ?? id),
};

const started = performance.now();
const report = formatHeroReport(content, names);
const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'heroes.md'), report);

const matrix = squadMatrix(content, 0);
for (const squad of [...HUMAN_SQUADS, ...SKETCH_SQUADS]) {
  const wins = Object.entries(matrix[squad] ?? {})
    .filter(([, cell]) => cell.outcome === 'win')
    .map(([other]) => names.tribe(other));
  console.log(
    `${names.tribe(squad).padEnd(18)} jako gracz wygrywa z: ${wins.join(', ') || 'nikim'}`,
  );
}
console.log(`\nRaport: reports/heroes.md (${(performance.now() - started).toFixed(0)} ms)`);
