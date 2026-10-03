import { describe, expect, it } from 'vitest';
import { dictionaries, pickLanguage, SOURCE_LANGUAGE } from './index.ts';
import { validateDictionaries } from './validate.ts';

describe('słowniki i18n', () => {
  it('wszystkie języki są zgodne ze źródłowym', () => {
    expect(validateDictionaries(dictionaries, SOURCE_LANGUAGE)).toEqual([]);
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
