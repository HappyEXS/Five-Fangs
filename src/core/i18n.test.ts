import { describe, expect, it } from 'vitest';
import { formatMessage, translate } from './i18n.ts';

const pl = { 'menu.play': 'Graj', 'result.gold': 'Zdobyto {gold} złota' };
const en = { 'menu.play': 'Play', 'result.gold': 'You earned {gold} gold', 'menu.quit': 'Quit' };

describe('i18n', () => {
  it('podstawia parametry', () => {
    expect(formatMessage('Poziom {n} z {total}', { n: 3, total: 30 })).toBe('Poziom 3 z 30');
  });

  it('zostawia nieznane znaczniki i tekst bez parametrów', () => {
    expect(formatMessage('Witaj, {name}!', {})).toBe('Witaj, {name}!');
    expect(formatMessage('Bez {zmian}')).toBe('Bez {zmian}');
  });

  it('tłumaczy klucz ze słownika', () => {
    expect(translate(pl, en, 'menu.play')).toBe('Graj');
    expect(translate(pl, en, 'result.gold', { gold: 120 })).toBe('Zdobyto 120 złota');
  });

  it('sięga do słownika zapasowego, a przy braku zwraca klucz', () => {
    expect(translate(pl, en, 'menu.quit')).toBe('Quit');
    expect(translate(pl, en, 'menu.missing')).toBe('menu.missing');
  });
});
