// pnpm validate-content – walidacja wszystkich danych treści: schematy, odwołania, słowniki,
// reguły wynikające z niezmienników symulacji oraz składy referencyjne skryptu balansu.
import { loadContent } from '../src/content/load.ts';
import { validateContent } from '../src/content/validate.ts';
import { contentSimIssues } from './lib/content-sim-checks.ts';
import { loadReference } from './lib/reference-squads.ts';

const issues = [...validateContent()];
const { content } = loadContent();
if (content !== null) {
  issues.push(...contentSimIssues(content));
  issues.push(...loadReference(content).issues);
}

if (issues.length > 0) {
  for (const issue of issues) console.error(`${issue.source}: ${issue.message}`);
  console.error(`\nProblemy w treści: ${issues.length}`);
  process.exit(1);
}
console.log('Treść: OK');
