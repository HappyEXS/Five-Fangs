import { describe, expect, it } from 'vitest';
import { loadContent, type RawContent, rawContent } from './load.ts';

const messages = (overrides: Partial<RawContent>) =>
  loadContent({ ...rawContent, ...overrides }).issues.map((i) => `${i.source}: ${i.message}`);

const hp = { id: 'hp', stat: 'maxHp', values: [50, 100] };
const tree = (...branches: unknown[]) => ({ 'runes.json': { branches } });

describe('drzewko run gry', () => {
  const { content } = loadContent();
  const branches = content?.runeTree ?? [];

  it('ma cztery kierunki: życie, atak, odrzut i szybkość', () => {
    expect(branches.map((branch) => [branch.id, branch.stat])).toEqual([
      ['hp', 'maxHp'],
      ['attack', 'attack'],
      ['knockback', 'knockback'],
      ['speed', 'moveSpeed'],
    ]);
  });

  it('runa dostaje id z kierunku i miejsca w nim, a kolejna jest mocniejsza od poprzedniej', () => {
    for (const branch of branches) {
      expect(branch.runes.length, branch.id).toBeGreaterThan(1);
      branch.runes.forEach((rune, depth) => {
        expect(rune).toMatchObject({
          id: `${branch.id}_${depth + 1}`,
          branch: branch.id,
          depth,
          stat: branch.stat,
        });
        expect(content?.runes.get(rune.id)).toBe(rune);
        const previous = branch.runes[depth - 1];
        if (previous !== undefined) expect(rune.value, rune.id).toBeGreaterThan(previous.value);
      });
    }
    expect(content?.runes.size).toBe(branches.reduce((sum, b) => sum + b.runes.length, 0));
  });

  it('premia jest przeliczona na jednostki symulacji', () => {
    for (const rune of content?.runes.values() ?? []) {
      // Życie i atak to punkty; odrzut 256 podjednostek na jednostkę świata; szybkość 256
      // podjednostek na jednostkę i 30 ticków na sekundę, bez reszty.
      const expected =
        rune.stat === 'knockback'
          ? rune.value * 256
          : rune.stat === 'moveSpeed'
            ? (rune.value * 256) / 30
            : rune.value;
      expect(rune.bonus, rune.id).toBe(expected);
      expect(Number.isInteger(rune.bonus), rune.id).toBe(true);
    }
  });
});

describe('walidacja drzewka run', () => {
  it('przyjmuje drzewko z jednym kierunkiem', () => {
    const { content, issues } = loadContent({ ...rawContent, ...tree(hp) });
    expect(issues).toEqual([]);
    expect([...(content?.runes.keys() ?? [])]).toEqual(['hp_1', 'hp_2']);
    expect(content?.runes.get('hp_2')).toEqual({
      id: 'hp_2',
      branch: 'hp',
      depth: 1,
      stat: 'maxHp',
      value: 100,
      bonus: 100,
    });
  });

  it('odrzuca powtórzony kierunek i drugi kierunek tej samej statystyki', () => {
    expect(messages(tree(hp, hp))).toEqual(['runes.json: powtórzone id "hp"']);
    expect(messages(tree(hp, { ...hp, id: 'life' }))).toEqual([
      'runes.json: life: statystyka "maxHp" ma już swój kierunek',
    ]);
  });

  it('odrzuca kierunek, w którym dalsza runa nie jest mocniejsza', () => {
    expect(messages(tree({ ...hp, values: [50, 50, 80] }))).toEqual([
      'runes.json: hp: runa 2 (50) musi być mocniejsza od poprzedniej (50)',
    ]);
    expect(messages(tree({ ...hp, values: [50, 80, 70] }))).toEqual([
      'runes.json: hp: runa 3 (70) musi być mocniejsza od poprzedniej (80)',
    ]);
  });

  it('odrzuca runę szybkości, która nie daje pełnego kroku na tick', () => {
    const speed = { id: 'speed', stat: 'moveSpeed', values: [15, 40] };
    expect(messages(tree(speed))).toEqual([
      'runes.json: speed: runa 2 (40) nie daje pełnego kroku na tick; szybkość musi być wielokrotnością 15',
    ]);
    // Kierunek z błędem nie trafia do treści: żadna jego runa nie jest dostępna.
    const { content } = loadContent({ ...rawContent, ...tree(hp, speed) });
    expect(content?.runeTree.map((branch) => branch.id)).toEqual(['hp']);
  });

  it('odrzuca dane spoza schematu: brak kierunków, nieznaną statystykę, wartość niedodatnią', () => {
    const broken = (data: unknown) =>
      loadContent({ ...rawContent, 'runes.json': data }).content === null;
    expect(broken({ branches: [] })).toBe(true);
    expect(broken({ branches: [{ ...hp, stat: 'range' }] })).toBe(true);
    expect(broken({ branches: [{ ...hp, values: [0, 10] }] })).toBe(true);
    expect(broken({ branches: [{ ...hp, values: [] }] })).toBe(true);
    // Dawny format: lista run z własnymi id.
    expect(broken([{ id: 'rune_hp_100', stat: 'maxHp', value: 100 }])).toBe(true);
  });
});
