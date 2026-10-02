import { describe, expect, it } from 'vitest';
import { dictionaries, LANGUAGES, pickLanguage, SOURCE_LANGUAGE } from './index.ts';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('słowniki i18n', () => {
  const sourceKeys = Object.keys(dictionaries[SOURCE_LANGUAGE]).sort();

  it.each(LANGUAGES)('język %s ma dokładnie te same klucze co źródłowy', (lang) => {
    expect(Object.keys(dictionaries[lang]).sort()).toEqual(sourceKeys);
  });

  it.each(LANGUAGES)('język %s nie ma pustych tekstów i ma te same parametry', (lang) => {
    for (const key of sourceKeys) {
      const text = dictionaries[lang][key] ?? '';
      expect(text.trim(), key).not.toBe('');
      expect(placeholders(text), key).toEqual(
        placeholders(dictionaries[SOURCE_LANGUAGE][key] ?? ''),
      );
    }
  });
});

describe('pickLanguage', () => {
  it('wybiera pierwszy obsługiwany język z listy preferencji', () => {
    expect(pickLanguage(['pl-PL', 'en-US'])).toBe('pl');
    expect(pickLanguage(['en-GB', 'pl'])).toBe('en');
    expect(pickLanguage(['de-DE', 'PL'])).toBe('pl');
  });

  it('dla nieobsługiwanych języków i pustej listy wybiera angielski', () => {
    expect(pickLanguage(['de-DE', 'fr'])).toBe('en');
    expect(pickLanguage([])).toBe('en');
  });
});
