// Źródła atlasu: katalog `assets/src/<atlas>/` z plikami PNG i manifestem `atlas.json`.
// Nazwa sprite'a to ścieżka pliku względem katalogu atlasu, bez rozszerzenia
// (`swordsman_a/torso.png` → `swordsman_a/torso`).
import { z } from 'zod';

export const MANIFEST_FILE = 'atlas.json';

export const atlasManifestSchema = z.strictObject({
  /**
   * Znacznik źródeł wygenerowanych przez `pnpm atlas:placeholder`. Generator nadpisuje tylko
   * katalogi z tym znacznikiem, więc ręcznie przygotowane grafiki są przed nim bezpieczne.
   */
  generator: z.literal('placeholder').optional(),
  /** Piksele obrazu na jednostkę rigu; wspólne dla wszystkich sprite'ów atlasu. */
  pixelsPerUnit: z.number().int().positive(),
  /** Bezstratny WebP albo stratny o jakości `quality` (kanał alfa zawsze w pełnej jakości). */
  lossless: z.boolean().default(true),
  quality: z.number().int().min(1).max(100).default(90),
  // Punkt obrotu względem lewego górnego rogu obrazu, w jednostkach rigu. Klucz to nazwa
  // sprite'a albo wzorzec "*/<część>" dla tej części we wszystkich podkatalogach; dokładna
  // nazwa ma pierwszeństwo przed wzorcem. (Komentarz liniowy, bo wzorzec zamknąłby blokowy.)
  pivots: z.record(z.string(), z.tuple([z.number(), z.number()])),
});

export type AtlasManifest = z.infer<typeof atlasManifestSchema>;

const SPRITE_NAME = /^[a-z0-9_]+(?:\/[a-z0-9_]+)*$/;

/** Nazwa sprite'a dla ścieżki pliku względem katalogu atlasu albo null, gdy to nie jest PNG. */
export function spriteNameOf(relativePath: string): string | null {
  const path = relativePath.replaceAll('\\', '/');
  return path.endsWith('.png') ? path.slice(0, -'.png'.length) : null;
}

export function isValidSpriteName(name: string): boolean {
  return SPRITE_NAME.test(name);
}

export interface ResolvedPivots {
  readonly pivots: ReadonlyMap<string, readonly [number, number]>;
  readonly problems: readonly string[];
}

/**
 * Przypisuje pivot każdemu sprite'owi. Problemy: sprite bez pivota oraz wpis manifestu,
 * który nie pasuje do żadnego pliku (literówka albo pozostałość po usuniętej grafice).
 */
export function resolvePivots(
  manifest: Pick<AtlasManifest, 'pivots'>,
  names: readonly string[],
): ResolvedPivots {
  const pivots = new Map<string, readonly [number, number]>();
  const problems: string[] = [];
  const used = new Set<string>();
  for (const name of names) {
    const wildcard = `*/${name.slice(name.lastIndexOf('/') + 1)}`;
    const key = name in manifest.pivots ? name : wildcard;
    const pivot = manifest.pivots[key];
    if (pivot === undefined) {
      problems.push(`sprite "${name}" nie ma pivota w ${MANIFEST_FILE}`);
      continue;
    }
    used.add(key);
    pivots.set(name, pivot);
  }
  for (const key of Object.keys(manifest.pivots)) {
    if (!used.has(key)) problems.push(`pivot "${key}" nie pasuje do żadnego pliku`);
  }
  return { pivots, problems };
}
