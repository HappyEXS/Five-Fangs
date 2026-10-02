import { describe, expect, it } from 'vitest';
import { validateDictionaries } from './validate.ts';

const pl = { 'menu.play': 'Graj', 'result.gold': 'Zdobyto {gold} złota' };

describe('validateDictionaries', () => {
  it('zgodne słowniki nie mają problemów', () => {
    const en = { 'menu.play': 'Play', 'result.gold': 'You earned {gold} gold' };
    expect(validateDictionaries({ pl, en }, 'pl')).toEqual([]);
  });

  it('zgłasza brakujący, nadmiarowy i pusty klucz', () => {
    const en = { 'menu.play': ' ', 'menu.quit': 'Quit' };
    expect(validateDictionaries({ pl, en }, 'pl')).toEqual([
      { source: 'i18n/en.json', message: 'pusty tekst dla klucza "menu.play"' },
      { source: 'i18n/en.json', message: 'brak klucza "result.gold"' },
      { source: 'i18n/en.json', message: 'klucz "menu.quit" nie istnieje w języku źródłowym' },
    ]);
  });

  it('zgłasza różnicę w parametrach', () => {
    const en = { 'menu.play': 'Play', 'result.gold': 'You earned {amount} gold' };
    expect(validateDictionaries({ pl, en }, 'pl')).toEqual([
      { source: 'i18n/en.json', message: 'inne parametry niż w źródle dla klucza "result.gold"' },
    ]);
  });

  it('zgłasza brak słownika źródłowego', () => {
    expect(validateDictionaries({ en: {} }, 'pl')).toEqual([
      { source: 'i18n', message: 'brak słownika źródłowego "pl"' },
    ]);
  });
});
