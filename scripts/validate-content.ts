// pnpm validate-content – walidacja wszystkich danych treści: schematy, odwołania, słowniki,
// reguły wynikające z niezmienników symulacji, zgodność z atlasem oraz składy referencyjne
// skryptu balansu.
import unitsMeta from '../src/assets/generated/units.json' with { type: 'json' };
import { loadContent } from '../src/content/load.ts';
import { validateContent } from '../src/content/validate.ts';
import { contentAssetIssues } from './lib/content-asset-checks.ts';
import { contentSimIssues } from './lib/content-sim-checks.ts';
import { loadReference } from './lib/reference-squads.ts';

const issues = [...validateContent()];
const { content } = loadContent();
if (content !== null) {
  issues.push(...contentSimIssues(content));
  issues.push(...contentAssetIssues(content, new Set(Object.keys(unitsMeta.sprites))));
  issues.push(...loadReference(content).issues);
}

if (issues.length > 0) {
  for (const issue of issues) console.error(`${issue.source}: ${issue.message}`);
  console.error(`\nProblemy w treści: ${issues.length}`);
  process.exit(1);
}
console.log('Treść: OK');
