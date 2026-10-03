// Spójność słowników: każdy język ma te same klucze i te same parametry co źródłowy.
import type { Dictionary } from '../../core/i18n.ts';
import type { ContentIssue } from '../issues.ts';

function placeholders(text: string): string {
  return [...text.matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1] ?? '')
    .sort()
    .join(',');
}

export function validateDictionaries(
  dictionaries: Readonly<Record<string, Dictionary>>,
  sourceLanguage: string,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const source = dictionaries[sourceLanguage];
  if (source === undefined) {
    return [{ source: 'i18n', message: `brak słownika źródłowego "${sourceLanguage}"` }];
  }

  for (const [lang, dict] of Object.entries(dictionaries)) {
    const file = `i18n/${lang}.json`;
    for (const key of Object.keys(source)) {
      const text = dict[key];
      if (text === undefined) {
        issues.push({ source: file, message: `brak klucza "${key}"` });
      } else if (text.trim() === '') {
        issues.push({ source: file, message: `pusty tekst dla klucza "${key}"` });
      } else if (placeholders(text) !== placeholders(source[key] ?? '')) {
        issues.push({ source: file, message: `inne parametry niż w źródle dla klucza "${key}"` });
      }
    }
    for (const key of Object.keys(dict)) {
      if (!(key in source)) {
        issues.push({ source: file, message: `klucz "${key}" nie istnieje w języku źródłowym` });
      }
    }
  }
  return issues;
}
