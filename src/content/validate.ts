// Walidacja całej treści gry. Każdy nowy typ danych dopisuje tu swój walidator.
import { dictionaries, SOURCE_LANGUAGE } from './i18n/index.ts';
import { validateDictionaries } from './i18n/validate.ts';
import type { ContentIssue } from './issues.ts';

export function validateContent(): ContentIssue[] {
  return [...validateDictionaries(dictionaries, SOURCE_LANGUAGE)];
}
