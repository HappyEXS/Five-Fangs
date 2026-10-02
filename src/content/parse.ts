// Wspólne pomocniki wczytywania treści: walidacja schematem i indeksowanie po id.
import type { ZodType } from 'zod';
import type { ContentIssue } from './issues.ts';

/** Waliduje dane schematem. Przy błędzie dopisuje problemy ze ścieżką do pola i zwraca null. */
export function parse<T>(
  source: string,
  schema: ZodType<T>,
  data: unknown,
  issues: ContentIssue[],
): T | null {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const path = issue.path.length === 0 ? '' : `${issue.path.join('.')}: `;
    issues.push({ source, message: `${path}${issue.message}` });
  }
  return null;
}

/**
 * Mapa elementów po id. Powtórzone id (także względem `seen`, wspólnego dla kilku plików)
 * jest zgłaszane, a element pomijany.
 */
export function indexById<T extends { id: string }>(
  source: string,
  items: readonly T[],
  seen: Set<string>,
  issues: ContentIssue[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (seen.has(item.id)) {
      issues.push({ source, message: `powtórzone id "${item.id}"` });
      continue;
    }
    seen.add(item.id);
    map.set(item.id, item);
  }
  return map;
}
