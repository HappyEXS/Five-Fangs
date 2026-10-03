// Wykrywanie nowej wersji i obsługa nieudanego ładowania.
// Hosting serwuje tylko najnowszy build, więc po deployu leniwie ładowane pliki
// starej wersji znikają (docs/DEPLOY.md §7). Każdy dynamiczny import i każde ładowanie
// assetu musi przejść przez `guardedLoad`.
import { signal } from '@preact/signals';
import { recordError } from './errors.ts';
import { type GameVersion, gameVersion } from './version.ts';

/** Co pokazać graczowi po nieudanym ładowaniu. */
export type LoadFailure = 'none' | 'update' | 'offline';

export const loadFailure = signal<LoadFailure>('none');

export type UpdateStatus = 'current' | 'outdated' | 'unknown';

/** Pobiera version.json z serwera z pominięciem cache; zwraca sparsowaną treść. */
export type FetchVersion = () => Promise<unknown>;

const fetchVersionJson: FetchVersion = async () => {
  const response = await fetch(new URL('./version.json', document.baseURI), { cache: 'no-store' });
  if (!response.ok) throw new Error(`version.json: HTTP ${response.status}`);
  return response.json();
};

function readCommit(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('commit' in value)) return null;
  return typeof value.commit === 'string' ? value.commit : null;
}

/** Porównuje wersję na serwerze z wersją uruchomionej gry. */
export async function checkForUpdate(
  current: GameVersion = gameVersion,
  fetchVersion: FetchVersion = fetchVersionJson,
): Promise<UpdateStatus> {
  try {
    const commit = readCommit(await fetchVersion());
    if (commit === null) return 'unknown';
    return commit === current.commit ? 'current' : 'outdated';
  } catch {
    return 'unknown';
  }
}

/**
 * Wykonuje ładowanie i przy błędzie ustala przyczynę: nowa wersja na serwerze albo brak
 * połączenia. Ustawia `loadFailure`, zapisuje błąd w buforze i przekazuje go dalej.
 */
export async function guardedLoad<T>(
  what: string,
  load: () => Promise<T>,
  check: () => Promise<UpdateStatus> = checkForUpdate,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    recordError('load', error, what);
    loadFailure.value = (await check()) === 'outdated' ? 'update' : 'offline';
    throw error;
  }
}

const beforeReload: (() => void)[] = [];

/** Rejestruje czynność do wykonania tuż przed przeładowaniem strony, np. zapis stanu gry. */
export function onBeforeReload(action: () => void): void {
  beforeReload.push(action);
}

/** Przeładowuje stronę po wykonaniu zarejestrowanych czynności. Błąd jednej nie blokuje reszty. */
export function reloadGame(reload: () => void = () => location.reload()): void {
  for (const action of beforeReload) {
    try {
      action();
    } catch (error) {
      recordError('error', error, 'beforeReload');
    }
  }
  reload();
}

/** Najwyżej jedno zapytanie o wersję na ten czas; zmiany scen bywają częste. */
export const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Zwraca funkcję, która sprawdza wersję na serwerze nie częściej niż co `intervalMs`
 * i po wykryciu nowej pokazuje graczowi komunikat z przyciskiem odświeżenia.
 */
export function createUpdateChecker(
  check: () => Promise<UpdateStatus> = checkForUpdate,
  now: () => number = Date.now,
  intervalMs: number = UPDATE_CHECK_INTERVAL_MS,
): () => Promise<void> {
  let last = Number.NEGATIVE_INFINITY;
  return async () => {
    if (now() - last < intervalMs) return;
    last = now();
    if ((await check()) === 'outdated' && loadFailure.value === 'none') {
      loadFailure.value = 'update';
    }
  };
}
