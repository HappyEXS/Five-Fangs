// pnpm balance – walki składu odniesienia na wszystkich poziomach; raport w reports/balance.md
// (ADR 0025). Po zmianie poziomów, nagród, kosztów albo liczb bohaterów uruchom i porównaj raport
// z poprzednim commitem (git diff reports/).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pl from '../src/content/i18n/pl.json' with { type: 'json' };
import { requireContent } from '../src/content/load.ts';
import { formatBalanceReport, goldBefore, runBalance } from './lib/balance.ts';
import { loadReference } from './lib/reference-squads.ts';
import { runePaths, runPaths } from './lib/rune-paths.ts';

const content = requireContent();
const { reference, issues } = loadReference(content);
if (reference === null || issues.length > 0) {
  for (const issue of issues) console.error(`${issue.source}: ${issue.message}`);
  console.error('\nSkład odniesienia jest niepoprawny.');
  process.exit(1);
}

const started = performance.now();
const reports = runBalance(content, reference);
const pathRows = runPaths(content, reference, reports);
const elapsedMs = performance.now() - started;

// Nazwy kierunków drzewka to nazwy statystyk ze słownika gry.
const text = pl as Record<string, string>;
const branchName = (id: string): string => {
  const stat = content.runeTree.find((branch) => branch.id === id)?.stat;
  return (stat === undefined ? undefined : text[`stat.${stat}`]) ?? id;
};
const columns = runePaths(content, reference).map((path) => {
  if (path.id === 'reference') {
    return `Plan odniesienia (${reference.runes.map(branchName).join(', ').toLowerCase()} na zmianę)`;
  }
  if (path.id === 'all') return 'Wszystkie kierunki po równo';
  return `Najpierw ${branchName(path.id).toLowerCase()}`;
});

const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, 'balance.md'),
  formatBalanceReport(content, reports, { columns, rows: pathRows }),
);

for (const report of reports) {
  const mark = (win: boolean): string => (win ? 'W' : 'P');
  console.log(
    `${report.level.padEnd(6)} ${String(report.goldBefore).padStart(6)} zł  ${report.squad.padEnd(16)} bez run ${mark(report.plain.win)}  z runami ${mark(report.runed.win)}  ${report.verdict}`,
  );
}
const off = reports.filter((report) => report.verdict !== 'zgodny').length;
console.log(
  `\n${reports.length} poziomów w ${elapsedMs.toFixed(0)} ms, złoto całej gry: ${goldBefore(content).at(-1) ?? 0}. Niezgodnych: ${off}. Raport: reports/balance.md`,
);
