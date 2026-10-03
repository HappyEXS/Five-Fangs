// pnpm atlas – pakuje każdy katalog assets/src/<atlas>/ do src/assets/generated/<atlas>.webp
// i <atlas>.json. Z flagą --check niczego nie zapisuje, tylko sprawdza, czy wygenerowane pliki
// odpowiadają źródłom.
//
// Format źródeł: scripts/lib/atlas-source.ts i docs/ARCHITECTURE.md §5.6.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  ATLAS_BYTES_LIMIT,
  AtlasSourceError,
  buildAtlas,
  listAtlasNames,
  loadAtlasSource,
  outputPaths,
  serializeMeta,
  staleReasons,
} from './lib/atlas-pipeline.ts';
import { formatBytes } from './lib/size-budgets.ts';

const root = process.cwd();
const check = process.argv.includes('--check');
const names = listAtlasNames(root);
if (names.length === 0) {
  console.error('Brak katalogów atlasów w assets/src/.');
  process.exit(1);
}

let failed = false;
for (const name of names) {
  try {
    const source = await loadAtlasSource(root, name);
    if (check) {
      const reasons = await staleReasons(root, source);
      if (reasons.length > 0) {
        failed = true;
        console.error(`${name}: nieaktualny (${reasons.join(', ')}); uruchom: pnpm atlas`);
      } else {
        console.log(`${name}: aktualny`);
      }
      continue;
    }
    const built = await buildAtlas(source);
    const paths = outputPaths(root, name);
    mkdirSync(dirname(paths.image), { recursive: true });
    writeFileSync(paths.image, built.webp);
    writeFileSync(paths.meta, serializeMeta(built.meta));
    const count = Object.keys(built.meta.sprites).length;
    console.log(
      `${name}: ${built.meta.width}×${built.meta.height}, ${count} sprite'ów, ${formatBytes(built.webp.length)}`,
    );
    if (built.webp.length > ATLAS_BYTES_LIMIT) {
      failed = true;
      console.error(`${name}: atlas przekracza budżet ${formatBytes(ATLAS_BYTES_LIMIT)}`);
    }
  } catch (error) {
    if (!(error instanceof AtlasSourceError)) throw error;
    failed = true;
    console.error(error.message);
  }
}
if (failed) process.exit(1);
