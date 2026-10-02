// pnpm atlas:placeholder – zapisuje grafiki placeholder jako źródła atlasu w assets/src/units/.
// Wynik jest deterministyczny i leży w repozytorium; test sprawdza, że jest aktualny.
// Atlas z tych źródeł buduje `pnpm atlas`.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { SOURCE_ROOT } from './lib/atlas-pipeline.ts';
import { atlasManifestSchema, MANIFEST_FILE, spriteNameOf } from './lib/atlas-source.ts';
import { placeholderManifest, placeholderSprites } from './lib/placeholder-parts.ts';
import { encodePng } from './lib/raster.ts';

const dir = join(process.cwd(), SOURCE_ROOT, 'units');
const manifestPath = join(dir, MANIFEST_FILE);

// Nie nadpisujemy grafik przygotowanych ręcznie: katalog musi być pusty albo pochodzić
// z tego generatora.
if (existsSync(manifestPath)) {
  const existing = atlasManifestSchema.safeParse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  if (!existing.success || existing.data.generator !== 'placeholder') {
    console.error(
      `${relative(process.cwd(), dir)} nie pochodzi z generatora placeholderów; nic nie zmieniam.`,
    );
    process.exit(1);
  }
}

const sprites = placeholderSprites();
const names = new Set(sprites.map((sprite) => sprite.name));
for (const sprite of sprites) {
  const path = join(dir, `${sprite.name}.png`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(sprite.image));
}
writeFileSync(manifestPath, `${JSON.stringify(placeholderManifest(sprites), null, 2)}\n`);

// Grafiki, których generator już nie tworzy, zaśmiecałyby atlas.
let removed = 0;
for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
  if (!entry.isFile()) continue;
  const path = join(entry.parentPath, entry.name);
  const name = spriteNameOf(relative(dir, path));
  if (name !== null && !names.has(name)) {
    rmSync(path);
    removed++;
  }
}
console.log(
  `Źródła placeholder: ${sprites.length} plików w ${relative(process.cwd(), dir)}${removed > 0 ? `, usunięto ${removed} zbędnych` : ''}. Teraz: pnpm atlas`,
);
