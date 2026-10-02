// Słowniki tekstów widocznych dla gracza. Polski jest językiem źródłowym: wyznacza zbiór kluczy.
import type { Dictionary } from '../../core/i18n.ts';
import en from './en.json' with { type: 'json' };
import pl from './pl.json' with { type: 'json' };

export type Language = 'pl' | 'en';
export type MessageKey = keyof typeof pl;

export const LANGUAGES: readonly Language[] = ['pl', 'en'];

/** Język, z którego brane są teksty brakujące w wybranym słowniku. */
export const SOURCE_LANGUAGE: Language = 'pl';

export const dictionaries: Readonly<Record<Language, Dictionary>> = { pl, en };

/**
 * Wybiera język gry z listy preferencji przeglądarki (`navigator.languages`).
 * Polski dla polskojęzycznych, angielski dla wszystkich pozostałych.
 */
export function pickLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split('-')[0];
    if (primary === 'pl') return 'pl';
    if (primary === 'en') return 'en';
  }
  return 'en';
}
