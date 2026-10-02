// pnpm check:size – budżety rozmiaru dist/. Uruchamiać po `pnpm build`.
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readDist } from './lib/dist-files.ts';
import { type DistFileSize, evaluateBudgets, formatBytes } from './lib/size-budgets.ts';

const files: DistFileSize[] = readDist(join(process.cwd(), 'dist')).map((file) => ({
  path: file.path,
  raw: file.bytes.length,
  gzip: file.isText ? gzipSync(file.bytes, { level: 9 }).length : file.bytes.length,
}));

console.log('Pliki w dist/:');
for (const file of files) {
  console.log(
    `  ${file.path.padEnd(44)} ${formatBytes(file.raw).padStart(10)}  gzip ${formatBytes(file.gzip).padStart(10)}`,
  );
}

console.log('\nBudżety:');
let failed = false;
for (const result of evaluateBudgets(files)) {
  const status = result.ok ? 'OK  ' : 'ZA DUŻO';
  const where = result.file === null ? '' : `  (${result.file})`;
  console.log(
    `  ${status} ${result.label.padEnd(34)} ${formatBytes(result.bytes).padStart(10)} / ${formatBytes(result.limit)}${where}`,
  );
  if (!result.ok) failed = true;
}

if (failed) {
  console.error('\nBuild przekracza budżet rozmiaru.');
  process.exit(1);
}
