import { describe, expect, it } from 'vitest';
import { loadContent, type RawContent, rawContent } from './load.ts';

const COSTS = [50, 80, 120, 180];
const base = { unit: 'swordsman_a', upgradeCosts: COSTS };
const evolved = { unit: 'swordsman_b', from: 'swordsman_a', evolveCost: 250, upgradeCosts: COSTS };
const line = { id: 'swordsman', forms: [base, evolved], price: 200, starter: true };
/** Linia z podanymi formami; reszta jak w `line`. */
const withForms = (forms: unknown[]) => ({ ...line, forms });

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

/** Gra z jednym światem: testy walidacji poziomów podmieniają tylko jego plik. */
const ONE_WORLD = [{ id: 'world_1', backdrop: 'castle' }];
const withLevels = (levels: unknown) =>
  messages({ 'worlds.json': ONE_WORLD, levels: { world_1: levels } });

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

  it('linie mają drzewo form z kosztami, cenę w sklepie i flagę linii startowej', () => {
    const archer = content?.lines.get('archer');
    expect(archer).toMatchObject({ id: 'archer', base: 'archer_a', price: 200, starter: true });
    expect([...(archer?.forms.keys() ?? [])]).toEqual([
      'archer_a',
      'archer_b',
      'cleric_a',
      'archer_b2',
      'hunter',
      'cleric_b',
      'inquisitor',
    ]);
    expect(archer?.forms.get('archer_a')).toEqual({
      unit: 'archer_a',
      from: null,
      evolveCost: 0,
      upgradeCosts: [50, 80, 120, 180],
      next: ['archer_b', 'cleric_a'],
      tier: 0,
    });
    expect(archer?.forms.get('inquisitor')).toEqual({
      unit: 'inquisitor',
      from: 'cleric_a',
      evolveCost: 1200,
      upgradeCosts: [1000, 1300, 1700, 2200],
      next: [],
      tier: 2,
    });
    expect(content?.lines.get('beasts')).toMatchObject({ price: 200, starter: false });
    expect([...(content?.lines.keys() ?? [])]).toEqual([
      'swordsman',
      'archer',
      'beasts',
      'immortals',
      'plants',
      'robots',
    ]);
  });

  it('sześć światów po sześć poziomów, każdy z własnym tłem', () => {
    expect(content?.worlds.map((world) => [world.id, world.backdrop])).toEqual([
      ['world_1', 'castle'],
      ['world_2', 'mechanus'],
      ['world_3', 'swamps'],
      ['world_4', 'jungle'],
      ['world_5', 'tower'],
      ['world_6', 'citadel'],
    ]);
    for (const [index, world] of (content?.worlds ?? []).entries()) {
      expect(world.levels).toEqual([1, 2, 3, 4, 5, 6].map((l) => `w${index + 1}_l${l}`));
    }
    expect(content?.levels.size).toBe(36);
  });

  it('światy mają poziomy w kolejności, a poziom zna swój świat i nagrody', () => {
    expect(content?.worlds[0]).toEqual({
      id: 'world_1',
      backdrop: 'castle',
      levels: ['w1_l1', 'w1_l2', 'w1_l3', 'w1_l4', 'w1_l5', 'w1_l6'],
    });
    expect(content?.levels.get('w1_l2')).toEqual({
      id: 'w1_l2',
      world: 'world_1',
      index: 1,
      // Wrogami są tu zwykłe postacie gry: formy bohaterów.
      enemies: [
        { slot: 0, unit: 'swordsman_a', level: 0 },
        { slot: 2, unit: 'archer_a', level: 0 },
      ],
      gold: 400,
      rune: 'rune_hp_100',
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
    const ghost = { unit: 'ghost', from: 'swordsman_a', evolveCost: 250, upgradeCosts: COSTS };
    expect(messages({ 'lines.json': [withForms([base, ghost])] })).toEqual([
      'lines.json: swordsman: nieznana forma "ghost"',
    ]);
    const second = {
      ...line,
      id: 'copy',
      forms: [
        { unit: 'archer_b', upgradeCosts: COSTS },
        { ...base, from: 'archer_b', evolveCost: 1 },
      ],
    };
    expect(messages({ 'lines.json': [line, second] })).toEqual([
      'lines.json: copy: forma "swordsman_a" należy już do innej linii',
    ]);
  });

  it('wymaga kompletu kosztów ulepszeń dla każdej formy', () => {
    const short = { ...base, upgradeCosts: [50, 80, 120] };
    expect(messages({ 'lines.json': [withForms([short, evolved])] })).toEqual([
      'lines.json: swordsman: forma "swordsman_a" musi mieć 4 kosztów ulepszeń (jest 3)',
    ]);
  });

  it('wymaga dokładnie jednej formy bazowej', () => {
    const second = { unit: 'swordsman_b', upgradeCosts: COSTS };
    expect(messages({ 'lines.json': [withForms([base, second])] })).toEqual([
      'lines.json: swordsman: musi mieć dokładnie jedną formę bazową, bez "from" (ma 2)',
    ]);
  });

  it('forma po ewolucji podaje razem, z czego powstaje i ile kosztuje ewolucja', () => {
    const { evolveCost: _cost, ...noCost } = evolved;
    expect(messages({ 'lines.json': [withForms([base, noCost])] })).toEqual([
      'lines.json: swordsman: forma "swordsman_b": "from" i "evolveCost" podaje się razem',
    ]);
  });

  it('odrzuca formę spoza linii jako źródło i cykl ewolucji', () => {
    const foreign = { ...evolved, from: 'archer_a' };
    expect(messages({ 'lines.json': [withForms([base, foreign])] })).toEqual([
      'lines.json: swordsman: forma "swordsman_b" powstaje z "archer_a", której nie ma w tej linii',
      'lines.json: swordsman: forma "swordsman_b" nie jest osiągalna z formy bazowej (cykl ewolucji)',
    ]);
    // swordsman_b i archer_b powstają nawzajem z siebie: żadna nie prowadzi do formy bazowej.
    const loop = [
      base,
      { ...evolved, from: 'archer_b' },
      { unit: 'archer_b', from: 'swordsman_b', evolveCost: 1, upgradeCosts: COSTS },
    ];
    expect(messages({ 'lines.json': [withForms(loop)] })).toEqual([
      'lines.json: swordsman: forma "swordsman_b" nie jest osiągalna z formy bazowej (cykl ewolucji)',
      'lines.json: swordsman: forma "archer_b" nie jest osiągalna z formy bazowej (cykl ewolucji)',
    ]);
  });

  it('odrzuca formę powtórzoną w linii', () => {
    expect(messages({ 'lines.json': [withForms([base, evolved, evolved])] })).toEqual([
      'lines.json: swordsman: forma "swordsman_b" powtórzona',
      'lines.json: swordsman: forma "swordsman_b" należy już do innej linii',
    ]);
  });

  it('wymaga dodatniej ceny; linia bez flagi nie jest startowa', () => {
    const { price: _price, ...free } = line;
    expect(messages({ 'lines.json': [free] })).not.toEqual([]);
    expect(messages({ 'lines.json': [{ ...line, price: 0 }] })).not.toEqual([]);
    const { starter: _starter, ...plain } = line;
    const { content: loaded } = loadContent({ ...rawContent, 'lines.json': [plain] });
    expect(loaded?.lines.get('swordsman')?.starter).toBe(false);
  });

  it('odrzuca błędny kształt linii', () => {
    expect(loadContent({ ...rawContent, 'lines.json': [withForms([])] }).content).toBeNull();
    const freeEvolve = { ...evolved, evolveCost: 0 };
    const zero = withForms([base, freeEvolve]);
    expect(loadContent({ ...rawContent, 'lines.json': [zero] }).content).toBeNull();
  });
});

describe('walidacja światów i poziomów', () => {
  it('wymaga pliku poziomów dla każdego świata i odrzuca plik nieznanego świata', () => {
    const two = [...ONE_WORLD, { id: 'world_2', backdrop: 'mechanus' }];
    expect(messages({ 'worlds.json': two, levels: { world_1: sixLevels() } })).toEqual([
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
    const unknown = [{ slot: 0, unit: 'nie_ma', level: 0 }];
    expect(withLevels(sixLevels({ enemies: unknown }))).toEqual([
      'levels/world_1.json: t1: nieznana jednostka "nie_ma"',
    ]);
    // Przeciwnikiem może być forma bohatera.
    const hero = [{ slot: 0, unit: 'swordsman_a', level: 2 }];
    expect(withLevels(sixLevels({ enemies: hero }))).toEqual([]);
  });

  it('sprawdza runę w nagrodzie', () => {
    expect(withLevels(sixLevels({ rewards: { gold: 5, rune: 'rune_of_nothing' } }))).toEqual([
      'levels/world_1.json: t1: nieznana runa "rune_of_nothing"',
    ]);
  });

  it('odrzuca poziom bez wrogów, slot spoza zakresu i ujemne złoto', () => {
    const load = (first: Record<string, unknown>) =>
      loadContent({
        ...rawContent,
        'worlds.json': ONE_WORLD,
        levels: { world_1: sixLevels(first) },
      });
    expect(load({ enemies: [] }).issues).not.toEqual([]);
    expect(load({ enemies: [{ slot: 5, unit: 'brute', level: 0 }] }).issues).not.toEqual([]);
    expect(load({ rewards: { gold: -1 } }).issues).not.toEqual([]);
  });

  it('odrzuca powtórzone id runy i świata', () => {
    const rune = { id: 'rune_attack_25', stat: 'attack', value: 25 };
    expect(messages({ 'runes.json': [rune, rune] })).toContain(
      'runes.json: powtórzone id "rune_attack_25"',
    );
    expect(
      messages({
        'worlds.json': [...ONE_WORLD, ...ONE_WORLD],
        levels: { world_1: rawContent.levels.world_1 },
      }),
    ).toEqual(['worlds.json: powtórzone id "world_1"']);
  });

  it('świat musi mieć jedno z teł, które renderer umie narysować', () => {
    const load = (world: unknown) =>
      loadContent({ ...rawContent, 'worlds.json': [world], levels: { world_1: sixLevels() } });
    expect(load({ id: 'world_1' }).content).toBeNull();
    expect(load({ id: 'world_1', backdrop: 'moon' }).content).toBeNull();
    expect(load({ id: 'world_1', backdrop: 'tower' }).content?.worlds[0]?.backdrop).toBe('tower');
  });
});
