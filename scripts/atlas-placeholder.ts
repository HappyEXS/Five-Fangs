// pnpm atlas:placeholder – generuje atlas postaci z grafik placeholder do src/assets/generated/.
// Wynik jest deterministyczny i leży w repozytorium; test sprawdza, że jest aktualny.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAtlas } from './lib/atlas-build.ts';
import { PIXELS_PER_UNIT, placeholderSprites } from './lib/placeholder-parts.ts';

const { png, meta } = buildAtlas(placeholderSprites(), PIXELS_PER_UNIT);
const dir = join(process.cwd(), 'src', 'assets', 'generated');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'units.png'), png);
writeFileSync(join(dir, 'units.json'), `${JSON.stringify(meta)}\n`);
console.log(
  `Atlas ${meta.width}×${meta.height}, ${Object.keys(meta.sprites).length} sprite'ów, ${(png.length / 1024).toFixed(1)} KB`,
);
