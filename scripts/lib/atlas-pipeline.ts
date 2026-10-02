// Potok atlasów: katalog źródłowy → obraz WebP + metadane w src/assets/generated/.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  type AtlasMeta,
  type AtlasSprite,
  type ComposedAtlas,
  composeAtlas,
} from './atlas-build.ts';
import {
  atlasManifestSchema,
  isValidSpriteName,
  MANIFEST_FILE,
  resolvePivots,
  spriteNameOf,
} from './atlas-source.ts';
import { decodeImage, encodeWebp, type WebpOptions } from './image-codec.ts';
import type { Image } from './raster.ts';
import { WORLD_ATLAS_LIMIT } from './size-budgets.ts';

export const SOURCE_ROOT = join('assets', 'src');
export const OUTPUT_ROOT = join('src', 'assets', 'generated');
/** Żaden atlas nie może przekroczyć budżetu pliku świata (CLAUDE.md). */
export const ATLAS_BYTES_LIMIT = WORLD_ATLAS_LIMIT;

export interface AtlasSource {
  readonly name: string;
  readonly pixelsPerUnit: number;
  readonly webp: WebpOptions;
  readonly sprites: readonly AtlasSprite[];
}

export class AtlasSourceError extends Error {}

/** Nazwy katalogów atlasów w `assets/src/`, posortowane. */
export function listAtlasNames(root: string): string[] {
  const sourceRoot = join(root, SOURCE_ROOT);
  if (!existsSync(sourceRoot)) return [];
  return readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Czyta manifest i grafiki jednego atlasu. Rzuca `AtlasSourceError` z listą problemów. */
export async function loadAtlasSource(root: string, name: string): Promise<AtlasSource> {
  const dir = join(root, SOURCE_ROOT, name);
  const manifestPath = join(dir, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    throw new AtlasSourceError(`${name}: brak pliku ${MANIFEST_FILE}`);
  }
  const parsed = atlasManifestSchema.safeParse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new AtlasSourceError(`${name}/${MANIFEST_FILE}: ${details.join('; ')}`);
  }
  const manifest = parsed.data;

  const files = new Map<string, string>();
  const problems: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const spriteName = spriteNameOf(relative(dir, path));
    if (spriteName === null) continue;
    if (isValidSpriteName(spriteName)) files.set(spriteName, path);
    else problems.push(`"${spriteName}": nazwa może zawierać tylko małe litery, cyfry i "_"`);
  }
  const names = [...files.keys()].sort();
  if (names.length === 0) problems.push('brak plików PNG');

  const { pivots, problems: pivotProblems } = resolvePivots(manifest, names);
  problems.push(...pivotProblems);
  if (problems.length > 0) throw new AtlasSourceError(`${name}: ${problems.join('; ')}`);

  const sprites: AtlasSprite[] = [];
  for (const spriteName of names) {
    const path = files.get(spriteName);
    const pivot = pivots.get(spriteName);
    if (path === undefined || pivot === undefined) continue;
    const image = await decodeImage(readFileSync(path));
    sprites.push({ name: spriteName, image, pivotX: pivot[0], pivotY: pivot[1] });
  }
  return {
    name,
    pixelsPerUnit: manifest.pixelsPerUnit,
    webp: { lossless: manifest.lossless, quality: manifest.quality },
    sprites,
  };
}

export interface BuiltAtlas extends ComposedAtlas {
  readonly name: string;
  readonly webp: Buffer;
}

export async function buildAtlas(source: AtlasSource): Promise<BuiltAtlas> {
  const composed = composeAtlas(source.sprites, source.pixelsPerUnit);
  return { name: source.name, ...composed, webp: await encodeWebp(composed.image, source.webp) };
}

export function outputPaths(root: string, name: string): { image: string; meta: string } {
  return {
    image: join(root, OUTPUT_ROOT, `${name}.webp`),
    meta: join(root, OUTPUT_ROOT, `${name}.json`),
  };
}

export function serializeMeta(meta: AtlasMeta): string {
  return `${JSON.stringify(meta)}\n`;
}

/**
 * Czy dwa obrazy wyglądają tak samo. Kolor w pełni przezroczystych pikseli nie ma znaczenia
 * (koder WebP może go zmienić), więc porównujemy go tylko tam, gdzie alfa jest większa od zera.
 */
export function sameVisiblePixels(a: Image, b: Image): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  for (let i = 0; i < a.data.length; i += 4) {
    const alpha = a.data[i + 3] ?? 0;
    if (alpha !== (b.data[i + 3] ?? 0)) return false;
    if (alpha === 0) continue;
    if (
      a.data[i] !== b.data[i] ||
      a.data[i + 1] !== b.data[i + 1] ||
      a.data[i + 2] !== b.data[i + 2]
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Porównuje pliki w src/assets/generated/ z tym, co dają źródła. Pusta lista = aktualne.
 * Obraz porównujemy po zdekodowaniu: bajty WebP mogą się różnić między wersjami kodera,
 * a przy atlasie stratnym sprawdzamy tylko wymiary.
 */
export async function staleReasons(root: string, source: AtlasSource): Promise<string[]> {
  const paths = outputPaths(root, source.name);
  if (!existsSync(paths.image) || !existsSync(paths.meta)) return ['brak wygenerowanych plików'];
  const composed = composeAtlas(source.sprites, source.pixelsPerUnit);
  const reasons: string[] = [];
  if (readFileSync(paths.meta, 'utf8') !== serializeMeta(composed.meta)) {
    reasons.push('metadane różnią się od źródeł');
  }
  const current = await decodeImage(readFileSync(paths.image));
  const same = source.webp.lossless
    ? sameVisiblePixels(composed.image, current)
    : current.width === composed.image.width && current.height === composed.image.height;
  if (!same) reasons.push('obraz różni się od źródeł');
  return reasons;
}
