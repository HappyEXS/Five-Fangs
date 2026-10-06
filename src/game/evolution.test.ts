import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import type { CompiledLine } from '../content/load-progression.ts';
import {
  applyEvolve,
  displayPath,
  evolveOptions,
  formPath,
  previewEvolve,
  tierCount,
  treeLayout,
} from './evolution.ts';
import { applyUpgrade, equipRune, heroView, newSave, upgradeCost } from './progress.ts';
import type { Save } from './save-schema.ts';

const content = requireContent();
// W nowej grze miecznik ma id 1.
const SWORD = 1;

function rich(gold: number): Save {
  return { ...newSave(content, '0.0.0', 'pl'), gold };
}

function upgraded(save: Save, times = 4): Save {
  let next = save;
  for (let i = 0; i < times; i++) next = applyUpgrade(content, next, SWORD) ?? next;
  return next;
}

function line(id: string): CompiledLine {
  const found = content.lines.get(id);
  if (found === undefined) throw new Error(`no line ${id}`);
  return found;
}

describe('evolveOptions i applyEvolve', () => {
  it('ewolucja jest dostępna dopiero po komplecie ulepszeń bieżącej formy', () => {
    let save = rich(5000);
    for (let i = 0; i < 4; i++) {
      expect(evolveOptions(content, save, SWORD)).toEqual([]);
      expect(applyEvolve(content, save, SWORD, 'swordsman_b')).toBeNull();
      save = upgraded(save, 1);
    }
    expect(evolveOptions(content, save, SWORD)).toEqual([
      { unitId: 'swordsman_b', cost: 250 },
      { unitId: 'guard_a', cost: 250 },
    ]);
  });

  it('gracz wybiera drogę: każda opcja daje inną formę bez ulepszeń, z kosztem tej formy', () => {
    const save = upgraded(rich(5000));
    const knight = applyEvolve(content, save, SWORD, 'swordsman_b');
    const guard = applyEvolve(content, save, SWORD, 'guard_a');
    expect(knight?.heroes[0]).toMatchObject({ form: 'swordsman_b', upgrades: 0 });
    expect(guard?.heroes[0]).toMatchObject({ form: 'guard_a', upgrades: 0 });
    expect(knight?.gold).toBe(save.gold - 250);
    // Po ewolucji bohater ma jednostkę, statystyki i cechy wybranej formy: Zbrojny bije
    // obszarowo, Tarczownik ma ponad dwa razy więcej życia niż Miecznik.
    expect(knight && heroView(content, knight, SWORD)?.spec.splashRadius).toBeGreaterThan(0);
    expect(guard && heroView(content, guard, SWORD)?.spec.splashRadius).toBe(0);
    expect(guard && heroView(content, guard, SWORD)?.spec.maxHp).toBe(1300);
    // Forma spoza dróg bieżącej formy nie jest dostępna.
    expect(applyEvolve(content, save, SWORD, 'swordsman_b2')).toBeNull();
    expect(applyEvolve(content, save, SWORD, 'archer_b')).toBeNull();
  });

  it('każda forma ma własne ulepszenia; trzeci stopień jest końcem drogi', () => {
    let save = upgraded(rich(20_000));
    save = applyEvolve(content, save, SWORD, 'guard_a') ?? save;
    expect(upgradeCost(content, save, SWORD)).toBe(300);
    expect(evolveOptions(content, save, SWORD)).toEqual([]);
    save = upgraded(save);
    // Z wybranej drogi prowadzą tylko jej dwie formy końcowe, nie formy drugiej gałęzi.
    expect(evolveOptions(content, save, SWORD)).toEqual([
      { unitId: 'guard_b', cost: 1200 },
      { unitId: 'pavise_guard', cost: 1200 },
    ]);
    expect(applyEvolve(content, save, SWORD, 'berserker')).toBeNull();
    save = applyEvolve(content, save, SWORD, 'pavise_guard') ?? save;
    expect(save.heroes[0]).toMatchObject({ form: 'pavise_guard', upgrades: 0 });
    expect(upgradeCost(content, save, SWORD)).toBe(1000);
    save = upgraded(save);
    expect(upgradeCost(content, save, SWORD)).toBeNull();
    expect(evolveOptions(content, save, SWORD)).toEqual([]);
  });

  it('ewolucja wymaga złota i zachowuje runy', () => {
    let save: Save = { ...rich(430), runes: ['rune_hp_200'] };
    save = equipRune(content, save, SWORD, 1, 'rune_hp_200') ?? save;
    save = upgraded(save);
    expect(save.gold).toBe(0);
    expect(applyEvolve(content, save, SWORD, 'swordsman_b')).toBeNull();
    const evolved = applyEvolve(content, { ...save, gold: 250 }, SWORD, 'swordsman_b');
    expect(evolved?.heroes[0]?.runes).toEqual([null, 'rune_hp_200']);
  });

  it('podgląd ewolucji liczy formę docelową bez ulepszeń, z runami bohatera', () => {
    let save: Save = { ...rich(1000), runes: ['rune_hp_200'] };
    save = equipRune(content, save, SWORD, 0, 'rune_hp_200') ?? save;
    const knight = content.heroes.get('swordsman_b');
    expect(previewEvolve(content, save, SWORD, 'swordsman_b')?.maxHp).toBe(
      (knight?.base.maxHp ?? 0) + 200,
    );
    expect(previewEvolve(content, save, SWORD, 'archer_b')).toBeNull();
  });
});

describe('drzewo form', () => {
  it('formPath: droga od formy bazowej do wskazanej', () => {
    expect(formPath(line('archer'), 'inquisitor')).toEqual(['archer_a', 'cleric_a', 'inquisitor']);
    expect(formPath(line('archer'), 'archer_a')).toEqual(['archer_a']);
    expect(formPath(line('archer'), 'swordsman_b')).toEqual([]);
  });

  it('displayPath: wskazana forma i dalej pierwsza droga do końca', () => {
    const swordsmen = line('swordsman');
    const first = ['swordsman_a', 'swordsman_b', 'swordsman_b2'];
    expect(displayPath(swordsmen, 'swordsman_a')).toEqual(first);
    expect(displayPath(swordsmen, 'guard_a')).toEqual(['swordsman_a', 'guard_a', 'guard_b']);
    expect(displayPath(swordsmen, 'berserker')).toEqual([
      'swordsman_a',
      'swordsman_b',
      'berserker',
    ]);
    expect(displayPath(swordsmen, 'nieznana')).toEqual(first);
  });

  it('treeLayout: kolumna to stopień, rozwidlenie zajmuje wiersze swoich gałęzi', () => {
    // Łucznicy: forma bazowa, dwie pierwsze ewolucje, z każdej po dwie formy końcowe.
    expect(treeLayout(line('archer'))).toEqual([
      { unit: 'archer_a', tier: 0, row: 0, rows: 4 },
      { unit: 'archer_b', tier: 1, row: 0, rows: 2 },
      { unit: 'cleric_a', tier: 1, row: 2, rows: 2 },
      { unit: 'archer_b2', tier: 2, row: 0, rows: 1 },
      { unit: 'hunter', tier: 2, row: 1, rows: 1 },
      { unit: 'cleric_b', tier: 2, row: 2, rows: 1 },
      { unit: 'inquisitor', tier: 2, row: 3, rows: 1 },
    ]);
    expect(tierCount(line('archer'))).toBe(3);
  });

  it('treeLayout obsługuje rozwidlenie na dalszym stopniu i drogi różnej długości', () => {
    const forms = new Map(
      [
        { unit: 'x_a', from: null, next: ['x_b', 'x_c'], tier: 0 },
        { unit: 'x_b', from: 'x_a', next: ['x_d', 'x_e'], tier: 1 },
        { unit: 'x_c', from: 'x_a', next: [], tier: 1 },
        { unit: 'x_d', from: 'x_b', next: [], tier: 2 },
        { unit: 'x_e', from: 'x_b', next: [], tier: 2 },
      ].map((form) => [form.unit, { ...form, evolveCost: 1, upgradeCosts: [1, 1, 1, 1] }]),
    );
    const tree: CompiledLine = { id: 'x', base: 'x_a', forms, price: 1, starter: false };
    expect(treeLayout(tree).map((cell) => [cell.unit, cell.row, cell.rows])).toEqual([
      ['x_a', 0, 3],
      ['x_b', 0, 2],
      ['x_c', 2, 1],
      ['x_d', 0, 1],
      ['x_e', 1, 1],
    ]);
    expect(displayPath(tree, 'x_c')).toEqual(['x_a', 'x_c']);
    expect(tierCount(tree)).toBe(3);
  });
});
