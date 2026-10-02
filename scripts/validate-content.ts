// pnpm validate-content – walidacja wszystkich danych treści.
import { validateContent } from '../src/content/validate.ts';

const issues = validateContent();
if (issues.length > 0) {
  for (const issue of issues) console.error(`${issue.source}: ${issue.message}`);
  console.error(`\nProblemy w treści: ${issues.length}`);
  process.exit(1);
}
console.log('Treść: OK');
