// pnpm check:dist – test czystości dist/. Uruchamiać po `pnpm build`.
import { join } from 'node:path';
import { checkDist } from './lib/dist-checks.ts';
import { readDist } from './lib/dist-files.ts';

const files = readDist(join(process.cwd(), 'dist')).map((file) => ({
  path: file.path,
  text: file.isText ? file.bytes.toString('utf8') : null,
}));

const problems = checkDist(files);
if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error(`\nProblemy w dist/: ${problems.length}`);
  process.exit(1);
}
console.log(`Czystość dist/: OK (${files.length} plików)`);
