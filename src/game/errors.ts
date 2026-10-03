// Bufor ostatnich błędów w pamięci. Gra nie ma backendu, więc to jedyne źródło
// diagnostyki: trafia do raportu „Zgłoś problem” (docs/ARCHITECTURE.md §6.3).

export type ErrorKind = 'error' | 'unhandledrejection' | 'load';

export interface ErrorEntry {
  /** Czas zdarzenia w ISO 8601. */
  at: string;
  kind: ErrorKind;
  message: string;
  stack: string | null;
  /** Co było ładowane albo skąd pochodzi błąd. */
  context: string | null;
}

export const MAX_ERRORS = 20;

const entries: ErrorEntry[] = [];

function describe(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return { message: `${error.name}: ${error.message}`, stack: error.stack ?? null };
  }
  if (typeof error === 'string') return { message: error, stack: null };
  try {
    return { message: JSON.stringify(error) ?? String(error), stack: null };
  } catch {
    return { message: String(error), stack: null };
  }
}

export function recordError(
  kind: ErrorKind,
  error: unknown,
  context: string | null = null,
  now: Date = new Date(),
): void {
  const { message, stack } = describe(error);
  entries.push({ at: now.toISOString(), kind, message, stack, context });
  if (entries.length > MAX_ERRORS) entries.splice(0, entries.length - MAX_ERRORS);
}

/** Kopia bufora, od najstarszego do najnowszego. */
export function recentErrors(): ErrorEntry[] {
  return entries.map((entry) => ({ ...entry }));
}

export function clearErrors(): void {
  entries.length = 0;
}

/** Podpina bufor pod nieobsłużone błędy i odrzucone obietnice okna. */
export function installGlobalErrorHandlers(target: Window): void {
  target.addEventListener('error', (event) => {
    recordError('error', event.error ?? event.message, event.filename || null);
  });
  target.addEventListener('unhandledrejection', (event) => {
    recordError('unhandledrejection', event.reason);
  });
}
