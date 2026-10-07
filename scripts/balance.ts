// pnpm balance – walki składu odniesienia na wszystkich poziomach; raport w reports/balance.md
// (ADR 0025). Po zmianie poziomów, nagród, kosztów albo liczb bohaterów uruchom i porównaj raport
// z poprzednim commitem (git diff reports/).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { requireContent } from '../src/content/load.ts';
import { formatBalanceReport, goldBefore, runBalance } from './lib/balance.ts';
import { loadReference } from './lib/reference-squads.ts';

const content = requireContent();
const { reference, issues } = loadReference(content);
if (reference === null || issues.length > 0) {
  for (const issue of issues) console.error(`${issue.source}: ${issue.message}`);
  console.error('\nSkład odniesienia jest niepoprawny.');
  process.exit(1);
}

const started = performance.now();
const reports = runBalance(content, reference);
const elapsedMs = performance.now() - started;

const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'balance.md'), formatBalanceReport(content, reports));

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
