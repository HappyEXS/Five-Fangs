// pnpm balance – walki składów referencyjnych na wszystkich poziomach; raport w reports/balance.md.
// Po zmianie balansu uruchom i porównaj raport z poprzednim commitem (git diff reports/).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { requireContent } from '../src/content/load.ts';
import { formatBalanceReport, rankLabel, runBalance } from './lib/balance.ts';
import { loadReference } from './lib/reference-squads.ts';

const content = requireContent();
const { reference, issues } = loadReference(content);
if (reference === null || issues.length > 0) {
  for (const issue of issues) console.error(`${issue.source}: ${issue.message}`);
  console.error('\nSkłady referencyjne są niepoprawne.');
  process.exit(1);
}

const started = performance.now();
const reports = runBalance(content, reference);
const elapsedMs = performance.now() - started;

const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'balance.md'), formatBalanceReport(content, reports));

for (const report of reports) {
  const min = report.minWinningRank === null ? 'brak' : rankLabel(content, report.minWinningRank);
  console.log(
    `${report.level.padEnd(8)} oczekiwana ${rankLabel(content, report.expectedRank)}  wygrywa od ${min.padEnd(4)}  ${report.verdict}`,
  );
}
const off = reports.filter((r) => r.verdict !== 'zgodny').length;
const battles = reports.reduce((sum, r) => sum + r.ranks.length, 0);
console.log(
  `\n${reports.length} poziomów, ${battles} walk w ${elapsedMs.toFixed(0)} ms. Niezgodnych z oczekiwaniem: ${off}. Raport: reports/balance.md`,
);
