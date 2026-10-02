import { describe, expect, it } from 'vitest';
import { loadContent, type RawContent, rawContent } from './load.ts';

const line = {
  id: 'swordsman',
  forms: ['swordsman_a', 'swordsman_b'],
  upgradeCosts: [
    [50, 80, 120, 180],
    [300, 400, 550, 750],
  ],
  evolveCost: 250,
  unlock: { type: 'start' },
};

const level = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  enemies: [{ slot: 0, unit: 'brute', level: 0 }],
  rewards: { gold: 10 },
  ...overrides,
});

const sixLevels = (first: Record<string, unknown> = {}) => [
  level('t1', first),
  level('t2'),
  level('t3'),
  level('t4'),
  level('t5'),
  level('t6'),
];

const messages = (overrides: Partial<RawContent>) =>
  loadContent({ ...rawContent, ...overrides }).issues.map((i) => `${i.source}: ${i.message}`);

const withLevels = (levels: unknown) => messages({ levels: { world_1: levels } });

describe('dane progresji gry', () => {
  const { content, issues } = loadContent();

  it('wczytują się bez problemów', () => {
    expect(issues).toEqual([]);
    expect(content?.progression).toEqual({
      maxUpgrades: 4,
      upgradePercent: 10,
      runeSlots: 2,
      replayGoldPercent: 25,
      levelsPerWorld: 6,
    });
  });

  it('linie mają dwie formy, koszty i warunek odblokowania', () => {
    expect(content?.lines.get('archer')).toEqual({
      id: 'archer',
      forms: ['archer_a', 'archer_b'],
      upgradeCosts: [
        [50, 80, 120, 180],
        [300, 400, 550, 750],
      ],
      evolveCost: 250,
      unlockLevel: null,
    });
  });

  it('światy mają poziomy w kolejności, a poziom zna swój świat i nagrody', () => {
    expect(content?.worlds).toEqual([
      { id: 'world_1', levels: ['w1_l1', 'w1_l2', 'w1_l3', 'w1_l4', 'w1_l5', 'w1_l6'] },
    ]);
    expect(content?.levels.get('w1_l2')).toEqual({
      id: 'w1_l2',
      world: 'world_1',
      index: 1,
      enemies: [
        { slot: 0, unit: 'brute', level: 0 },
        { slot: 1, unit: 'brute', level: 0 },
      ],
      gold: 600,
      rune: 'rune_hp_200',
    });
    expect(content?.levels.get('w1_l1')?.rune).toBeNull();
    expect(content?.runes.get('rune_attack_25')).toEqual({
      id: 'rune_attack_25',
      stat: 'attack',
      value: 25,
    });
  });
});

describe('walidacja linii', () => {
  it('odrzuca nieznaną formę i formę użytą w dwóch liniach', () => {
    expect(messages({ 'lines.json': [{ ...line, forms: ['swordsman_a', 'ghost'] }] })).toEqual([
      'lines.json: swordsman: nieznana forma "ghost"',
    ]);
    const second = { ...line, id: 'copy', forms: ['swordsman_a', 'archer_b'] };
    expect(messages({ 'lines.json': [line, second] })).toEqual([
      'lines.json: copy: forma "swordsman_a" należy już do innej linii',
    ]);
  });

  it('wymaga kompletu kosztów ulepszeń dla każdej formy', () => {
    const short = { ...line, upgradeCosts: [[50, 80, 120], line.upgradeCosts[1]] };
    expect(messages({ 'lines.json': [short] })).toEqual([
      'lines.json: swordsman: każda forma musi mieć 4 kosztów ulepszeń (jest 3)',
    ]);
  });

  it('sprawdza poziom odblokowujący linię', () => {
    const ok = { ...line, unlock: { type: 'level', level: 'w1_l6' } };
    expect(messages({ 'lines.json': [ok] })).toEqual([]);
    const bad = { ...line, unlock: { type: 'level', level: 'w9_l9' } };
    expect(messages({ 'lines.json': [bad] })).toEqual([
      'lines.json: swordsman: nieznany poziom "w9_l9"',
    ]);
  });

  it('odrzuca błędny kształt linii', () => {
    const oneForm = { ...line, forms: ['swordsman_a'] };
    expect(loadContent({ ...rawContent, 'lines.json': [oneForm] }).content).toBeNull();
    const freeUpgrade = { ...line, evolveCost: 0 };
    expect(loadContent({ ...rawContent, 'lines.json': [freeUpgrade] }).content).toBeNull();
  });
});

describe('walidacja światów i poziomów', () => {
  it('wymaga pliku poziomów dla każdego świata i odrzuca plik nieznanego świata', () => {
    expect(messages({ 'worlds.json': [{ id: 'world_1' }, { id: 'world_2' }] })).toEqual([
      'worlds.json: world_2: brak pliku levels/world_2.json',
    ]);
    expect(messages({ levels: { ...rawContent.levels, world_9: sixLevels() } })).toEqual([
      'levels/world_9.json: plik poziomów nieznanego świata',
    ]);
  });

  it('wymaga ustalonej liczby poziomów w świecie', () => {
    expect(withLevels([level('t1'), level('t2')])).toEqual([
      'levels/world_1.json: świat ma 2 poziomów, wymagane 6',
    ]);
  });

  it('odrzuca powtórzone id poziomu', () => {
    const levels = sixLevels();
    levels[5] = level('t1');
    expect(withLevels(levels)).toEqual(['levels/world_1.json: powtórzone id "t1"']);
  });

  it('sprawdza wrogów poziomu', () => {
    const twice = [
      { slot: 2, unit: 'brute', level: 0 },
      { slot: 2, unit: 'brute', level: 1 },
    ];
    expect(withLevels(sixLevels({ enemies: twice }))).toEqual([
      'levels/world_1.json: t1: slot 2 użyty więcej niż raz',
    ]);
    const unknown = [{ slot: 0, unit: 'swordsman_a', level: 0 }];
    expect(withLevels(sixLevels({ enemies: unknown }))).toEqual([
      'levels/world_1.json: t1: nieznany wróg "swordsman_a"',
    ]);
  });

  it('sprawdza runę w nagrodzie', () => {
    expect(withLevels(sixLevels({ rewards: { gold: 5, rune: 'rune_of_nothing' } }))).toEqual([
      'levels/world_1.json: t1: nieznana runa "rune_of_nothing"',
    ]);
  });

  it('odrzuca poziom bez wrogów, slot spoza zakresu i ujemne złoto', () => {
    const load = (first: Record<string, unknown>) =>
      loadContent({ ...rawContent, levels: { world_1: sixLevels(first) } });
    expect(load({ enemies: [] }).issues).not.toEqual([]);
    expect(load({ enemies: [{ slot: 5, unit: 'brute', level: 0 }] }).issues).not.toEqual([]);
    expect(load({ rewards: { gold: -1 } }).issues).not.toEqual([]);
  });

  it('odrzuca powtórzone id runy i świata', () => {
    const rune = { id: 'rune_attack_25', stat: 'attack', value: 25 };
    expect(messages({ 'runes.json': [rune, rune] })).toContain(
      'runes.json: powtórzone id "rune_attack_25"',
    );
    expect(messages({ 'worlds.json': [{ id: 'world_1' }, { id: 'world_1' }] })).toEqual([
      'worlds.json: powtórzone id "world_1"',
    ]);
  });
});
