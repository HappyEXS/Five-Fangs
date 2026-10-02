// Zapis gry: jedyne miejsce dostępu do localStorage (CLAUDE.md). Wczytanie to parsowanie,
// łańcuch migracji i walidacja schematem; błąd na dowolnym etapie nie może wywrócić gry.
import { MIGRATIONS, type Migration } from './save-migrations.ts';
import { SAVE_VERSION, type Save, saveSchema } from './save-schema.ts';

export const SAVE_KEY = 'five-fangs.save';
/** Ostatni zapis, którego nie udało się wczytać; trzymany, żeby dało się go odzyskać ręcznie. */
export const BACKUP_KEY = 'five-fangs.save.backup';

/** Część interfejsu Storage, której używa zapis; w testach podstawiamy zwykły obiekt. */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type DecodeResult<T> =
  | { readonly kind: 'ok'; readonly save: T; readonly migratedFrom: number | null }
  /** Zapis z nowszej wersji gry: nie wolno go nadpisać. */
  | { readonly kind: 'newer'; readonly saveVersion: number }
  | { readonly kind: 'corrupt'; readonly reason: string };

export interface SaveFormat<T> {
  readonly version: number;
  readonly migrations: Readonly<Record<number, Migration>>;
  /** Walidacja zapisu w bieżącej wersji; zwraca zapis albo opis błędu. */
  validate(data: unknown): { ok: true; save: T } | { ok: false; reason: string };
}

export const SAVE_FORMAT: SaveFormat<Save> = {
  version: SAVE_VERSION,
  migrations: MIGRATIONS,
  validate(data) {
    const parsed = saveSchema.safeParse(data);
    if (parsed.success) return { ok: true, save: parsed.data };
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return { ok: false, reason: details.join('; ') };
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Zamienia tekst zapisu na zapis w bieżącej wersji gry. Nie rzuca błędów. */
export function decodeSave(text: string): DecodeResult<Save> {
  return decodeWith(text, SAVE_FORMAT);
}

/** Jak `decodeSave`, ale dla podanego formatu; testy sprawdzają tak łańcuch migracji. */
export function decodeWith<T>(text: string, format: SaveFormat<T>): DecodeResult<T> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { kind: 'corrupt', reason: 'not JSON' };
  }
  if (!isRecord(data)) return { kind: 'corrupt', reason: 'not an object' };
  const from = data.saveVersion;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) {
    return { kind: 'corrupt', reason: 'missing saveVersion' };
  }
  if (from > format.version) return { kind: 'newer', saveVersion: from };

  let current = data;
  for (let version = from; version < format.version; version++) {
    const migrate = format.migrations[version];
    if (migrate === undefined) {
      return { kind: 'corrupt', reason: `no migration from version ${version}` };
    }
    try {
      current = migrate(current);
    } catch (error) {
      return {
        kind: 'corrupt',
        reason: `migration from version ${version} failed: ${String(error)}`,
      };
    }
    if (current.saveVersion !== version + 1) {
      return {
        kind: 'corrupt',
        reason: `migration from version ${version} did not bump saveVersion`,
      };
    }
  }

  const validated = format.validate(current);
  if (!validated.ok) return { kind: 'corrupt', reason: validated.reason };
  return { kind: 'ok', save: validated.save, migratedFrom: from === format.version ? null : from };
}

export function encodeSave(save: Save): string {
  return JSON.stringify(save);
}

export type LoadResult =
  /** Brak zapisu: nowa gra. */
  | { readonly kind: 'none' }
  | { readonly kind: 'ok'; readonly save: Save }
  /** Zapis uszkodzony: trafił do kopii zapasowej, gra zaczyna od nowa. */
  | { readonly kind: 'recovered'; readonly reason: string }
  /** Zapis z nowszej wersji gry: gra prosi o odświeżenie i niczego nie zapisuje. */
  | { readonly kind: 'newer'; readonly saveVersion: number }
  /** Pamięć przeglądarki niedostępna: gra działa bez zapisu. */
  | { readonly kind: 'unavailable' };

export function loadSave(storage: SaveStorage | null): LoadResult {
  if (storage === null) return { kind: 'unavailable' };
  let text: string | null;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch {
    return { kind: 'unavailable' };
  }
  if (text === null) return { kind: 'none' };

  const decoded = decodeSave(text);
  if (decoded.kind === 'ok') return { kind: 'ok', save: decoded.save };
  if (decoded.kind === 'newer') return decoded;
  try {
    storage.setItem(BACKUP_KEY, text);
  } catch {
    // Brak miejsca na kopię nie może zatrzymać gry; uszkodzony zapis i tak zostaje pod
    // SAVE_KEY do pierwszego zapisu nowej gry.
  }
  return { kind: 'recovered', reason: decoded.reason };
}

/** Zapisuje grę. Zwraca false, gdy pamięć przeglądarki odmówiła (tryb prywatny, brak miejsca). */
export function storeSave(storage: SaveStorage | null, save: Save): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(SAVE_KEY, encodeSave(save));
    return true;
  } catch {
    return false;
  }
}

/** localStorage przeglądarki albo null, gdy jest zablokowany. */
export function browserStorage(): SaveStorage | null {
  try {
    const storage = window.localStorage;
    // Sam dostęp do właściwości potrafi rzucić wyjątek przy zablokowanych ciasteczkach.
    storage.getItem(SAVE_KEY);
    return storage;
  } catch {
    return null;
  }
}
