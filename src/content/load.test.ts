import { describe, expect, it } from 'vitest';
import { loadContent, type RawContent, rawContent, requireContent } from './load.ts';
import { validateContent } from './validate.ts';

const unit = {
  id: 'swordsman',
  kind: 'melee',
  maxHp: 600,
  attack: 40,
  moveSpeed: 60,
  attackSpeed: 1,
  range: 30,
  knockback: 15,
  attackType: 'slash',
  skin: 'swordsman_a',
};

/** Treść z podanymi bohaterami, bez danych odwołujących się do prawdziwych jednostek gry. */
function withHeroes(heroes: unknown): RawContent {
  return {
    ...rawContent,
    'units/heroes.json': heroes,
    'units/enemies.json': [],
    'enemy-tribes.json': [],
    'lines.json': [],
    'worlds.json': [],
    levels: {},
  };
}

const messages = (raw: RawContent) =>
  loadContent(raw).issues.map((i) => `${i.source}: ${i.message}`);

describe('loadContent', () => {
  it('wczytuje treść gry bez problemów', () => {
    const { content, issues } = loadContent();
    expect(issues).toEqual([]);
    expect(content?.heroes.get('swordsman_a')?.base.maxHp).toBe(600);
    expect(content?.heroes.get('archer_a')?.base.projectileStep).toBeGreaterThan(0);
    expect(content?.heroes.get('archer_b')?.base.pierce).toBe(true);
    expect(content?.enemies.has('brute')).toBe(true);
    expect(content?.arena.timeLimitTicks).toBe(2700);
  });

  it('odrzuca odwołanie do nieistniejącego typu ataku', () => {
    expect(messages(withHeroes([{ ...unit, attackType: 'stab' }]))).toEqual([
      'units/heroes.json: swordsman: nieznany typ ataku "stab"',
    ]);
  });

  it('odrzuca powtórzone id, także między bohaterami a wrogami', () => {
    expect(messages(withHeroes([unit, unit]))).toEqual([
      'units/heroes.json: powtórzone id "swordsman"',
    ]);
    const raw: RawContent = { ...withHeroes([unit]), 'units/enemies.json': [unit] };
    expect(messages(raw)).toEqual(['units/enemies.json: powtórzone id "swordsman"']);
  });

  it('odrzuca niezgodność kind z typem ataku', () => {
    expect(messages(withHeroes([{ ...unit, kind: 'ranged' }]))[0]).toContain('nie pasuje');
    expect(messages(withHeroes([{ ...unit, attackType: 'shoot' }]))[0]).toContain('nie pasuje');
  });

  it('zgłasza błąd schematu ze ścieżką do pola i nie kompiluje treści', () => {
    const result = loadContent(withHeroes([{ ...unit, maxHp: -5, extra: true }]));
    expect(result.content).toBeNull();
    const text = result.issues.map((i) => `${i.source}: ${i.message}`).join('\n');
    expect(text).toContain('units/heroes.json: 0.maxHp');
    expect(text).toContain('extra');
  });

  it('wymaga dokładnie jednego z pól tempa ataków', () => {
    const { attackSpeed: _, ...noRate } = unit;
    expect(messages(withHeroes([{ ...noRate, attackInterval: 1.5 }]))).toEqual([]);
    expect(messages(withHeroes([noRate]))).toEqual([
      'units/heroes.json: 0.attackSpeed: podaj dokładnie jedno z pól: attackSpeed albo attackInterval',
    ]);
    expect(messages(withHeroes([{ ...unit, attackInterval: 1.5 }]))).toEqual([
      'units/heroes.json: 0.attackSpeed: podaj dokładnie jedno z pól: attackSpeed albo attackInterval',
    ]);
    expect(messages(withHeroes([{ ...noRate, attackInterval: 0 }]))[0]).toContain(
      '0.attackInterval',
    );
  });

  it('wymaga ułamka trafienia wewnątrz zamachu', () => {
    const raw: RawContent = {
      ...rawContent,
      'attacks.json': [
        { id: 'slash', swingDuration: 0.4, hitFraction: 1, clip: 'slash', stance: 'sword' },
      ],
    };
    expect(loadContent(raw).content).toBeNull();
  });

  it('kompiluje cechy pasywne jednostki', () => {
    const heal = { type: 'periodicHeal', target: 'team', amount: 20, interval: 2 };
    const { content, issues } = loadContent(withHeroes([{ ...unit, traits: [heal] }]));
    expect(issues).toEqual([]);
    expect(content?.heroes.get('swordsman')?.base).toMatchObject({
      healAmount: 20,
      healInterval: 60,
      healTeam: true,
    });
  });

  it('kompiluje szał, kradzież życia i cios obszarowy', () => {
    const traits = [
      { type: 'enrage', hpBelow: 50, attackBonus: 40 },
      { type: 'lifesteal', percent: 20 },
      { type: 'splash', radius: 35 },
    ];
    const { content, issues } = loadContent(withHeroes([{ ...unit, traits }]));
    expect(issues).toEqual([]);
    expect(content?.heroes.get('swordsman')?.base).toMatchObject({
      enrageHpPercent: 50,
      enrageAttackPercent: 40,
      lifestealPercent: 20,
      splashRadius: 35 * 256,
    });
  });

  it('odrzuca cios obszarowy u strzelca i wartości cech spoza zakresu', () => {
    const archer = { ...unit, kind: 'ranged', attackType: 'shoot' };
    expect(messages(withHeroes([{ ...archer, traits: [{ type: 'splash', radius: 30 }] }]))).toEqual(
      ['units/heroes.json: swordsman: cecha "splash" wymaga ataku wręcz'],
    );
    for (const trait of [
      { type: 'enrage', hpBelow: 100, attackBonus: 40 },
      { type: 'enrage', hpBelow: 50, attackBonus: 0 },
      { type: 'lifesteal', percent: 101 },
      { type: 'splash', radius: 0 },
    ]) {
      expect(loadContent(withHeroes([{ ...unit, traits: [trait] }])).content).toBeNull();
    }
  });

  it('odrzuca pierce u jednostki bez pocisku i powtórzoną cechę', () => {
    expect(messages(withHeroes([{ ...unit, traits: [{ type: 'pierce' }] }]))).toEqual([
      'units/heroes.json: swordsman: cecha "pierce" wymaga ataku z pociskiem',
    ]);
    const heal = { type: 'periodicHeal', target: 'self', amount: 5, interval: 1 };
    expect(messages(withHeroes([{ ...unit, traits: [heal, heal] }]))).toEqual([
      'units/heroes.json: swordsman: cecha "periodicHeal" występuje więcej niż raz',
    ]);
  });

  it('targetLast wymaga pocisku i wyklucza się z pierce', () => {
    const archer = { ...unit, kind: 'ranged', attackType: 'shoot' };
    expect(messages(withHeroes([{ ...unit, traits: [{ type: 'targetLast' }] }]))).toEqual([
      'units/heroes.json: swordsman: cecha "targetLast" wymaga ataku z pociskiem',
    ]);
    const both = [{ type: 'targetLast' }, { type: 'pierce' }];
    expect(messages(withHeroes([{ ...archer, traits: both }]))).toEqual([
      'units/heroes.json: swordsman: cechy "targetLast" i "pierce" wykluczają się',
    ]);
    expect(messages(withHeroes([{ ...archer, traits: [{ type: 'targetLast' }] }]))).toEqual([]);
  });

  it('przyzywacz wskazuje jednostkę z units/summons.json i dostaje jej specyfikację', () => {
    const sprout = { ...unit, id: 'sprout', maxHp: 100, skin: 'sprout' };
    const tree = { ...unit, id: 'tree', kind: 'summoner', attack: 0, summon: 'sprout' };
    const raw: RawContent = { ...withHeroes([tree]), 'units/summons.json': [sprout] };
    const { content, issues } = loadContent(raw);
    expect(issues).toEqual([]);
    expect(content?.summons.get('sprout')?.base.maxHp).toBe(100);
    expect(content?.heroes.get('tree')?.base.summon).toBe(content?.summons.get('sprout')?.base);
    expect(content?.heroes.get('tree')?.visual.summon?.skin).toBe('sprout');
  });

  it('kind summoner i pole summon idą razem; przyzywany musi istnieć i sam nie przyzywa', () => {
    const sprout = { ...unit, id: 'sprout', skin: 'sprout' };
    const withSummons = (heroes: unknown, summons: unknown): RawContent => ({
      ...withHeroes(heroes),
      'units/summons.json': summons,
    });
    expect(messages(withSummons([{ ...unit, kind: 'summoner' }], [sprout]))).toEqual([
      'units/heroes.json: swordsman: kind "summoner" i pole "summon" podaje się razem',
    ]);
    expect(messages(withSummons([{ ...unit, summon: 'sprout' }], [sprout]))).toEqual([
      'units/heroes.json: swordsman: kind "summoner" i pole "summon" podaje się razem',
    ]);
    expect(
      messages(withSummons([{ ...unit, kind: 'summoner', summon: 'nobody' }], [sprout])),
    ).toEqual(['units/heroes.json: swordsman: nieznana jednostka przyzywana "nobody"']);
    expect(
      messages(
        withSummons([], [sprout, { ...unit, id: 'seed', kind: 'summoner', summon: 'sprout' }]),
      ),
    ).toEqual(['units/summons.json: seed: przyzwana jednostka nie może przyzywać']);
    // Przyzywacz nie strzela: typ ataku z pociskiem do niego nie pasuje.
    expect(
      messages(
        withSummons(
          [{ ...unit, kind: 'summoner', summon: 'sprout', attackType: 'shoot' }],
          [sprout],
        ),
      )[0],
    ).toContain('nie pasuje');
    // Id przyzywanych leżą w tej samej przestrzeni co bohaterowie i wrogowie.
    expect(messages(withSummons([unit], [{ ...sprout, id: 'swordsman' }]))).toEqual([
      'units/heroes.json: powtórzone id "swordsman"',
    ]);
  });

  it('odrzuca nieznaną cechę i błędne parametry', () => {
    expect(
      loadContent(withHeroes([{ ...unit, traits: [{ type: 'lifesteal' }] }])).content,
    ).toBeNull();
    const badHeal = { type: 'periodicHeal', target: 'enemies', amount: 0, interval: -1 };
    expect(loadContent(withHeroes([{ ...unit, traits: [badHeal] }])).content).toBeNull();
  });
});

describe('requireContent', () => {
  it('zwraca treść albo rzuca błąd z listą problemów', () => {
    expect(requireContent().heroes.size).toBeGreaterThan(0);
    expect(() => requireContent(withHeroes([{ ...unit, attackType: 'stab' }]))).toThrow(
      /nieznany typ ataku/,
    );
  });
});

describe('szczepy wrogów', () => {
  const withTribes = (tribes: unknown): RawContent => ({
    ...rawContent,
    'enemy-tribes.json': tribes,
  });
  const tribe = (ranks: unknown) => [{ id: 'akronix', ranks }];

  it('wczytuje poczet Akronixów spłaszczony w kolejności siły', () => {
    const akronix = requireContent().enemyTribes.get('akronix');
    expect(akronix?.members).toHaveLength(10);
    expect(akronix?.members[0]).toEqual({ unit: 'bowix', rank: 'scout' });
    expect(akronix?.members[9]).toEqual({ unit: 'axin_3', rank: 'boss' });
  });

  it('odrzuca jednostkę spoza units/enemies.json, także formę bohatera', () => {
    expect(
      messages(withTribes(tribe([{ rank: 'scout', units: ['dragon', 'swordsman_a'] }]))),
    ).toEqual([
      'enemy-tribes.json: akronix: "dragon" nie jest jednostką z units/enemies.json',
      'enemy-tribes.json: akronix: "swordsman_a" nie jest jednostką z units/enemies.json',
    ]);
  });

  it('odrzuca jednostkę wpisaną dwa razy, powtórzony stopień i powtórzony szczep', () => {
    expect(
      messages(
        withTribes(
          tribe([
            { rank: 'scout', units: ['bowix', 'bowix'] },
            { rank: 'scout', units: ['katanix'] },
          ]),
        ),
      ),
    ).toEqual([
      'enemy-tribes.json: akronix: jednostka "bowix" należy już do szczepu',
      'enemy-tribes.json: akronix: powtórzony stopień "scout"',
    ]);
    const twice = [
      { id: 'akronix', ranks: [{ rank: 'scout', units: ['bowix'] }] },
      { id: 'akronix', ranks: [{ rank: 'boss', units: ['axin_1'] }] },
    ];
    expect(messages(withTribes(twice))).toEqual(['enemy-tribes.json: powtórzone id "akronix"']);
  });

  it('odrzuca szczep wrogów o id zajętym przez linię bohaterów', () => {
    const clash = [{ id: 'beasts', ranks: [{ rank: 'scout', units: ['bowix'] }] }];
    expect(messages(withTribes(clash))).toEqual([
      'enemy-tribes.json: beasts: id szczepu wrogów jest zajęte przez linię bohaterów',
    ]);
  });

  it('odrzuca szczep bez stopni i stopień bez jednostek', () => {
    expect(loadContent(withTribes(tribe([]))).content).toBeNull();
    expect(loadContent(withTribes(tribe([{ rank: 'scout', units: [] }]))).content).toBeNull();
  });

  it('wymaga nazwy szczepu i każdego stopnia w słowniku', () => {
    const issues = validateContent(
      withTribes([{ id: 'ghosts', ranks: [{ rank: 'wraith', units: ['bowix'] }] }]),
    );
    expect(issues).toEqual([
      {
        source: 'enemy-tribes.json',
        message: 'ghosts: brak tekstu "tribe.ghosts.name" w słowniku',
      },
      { source: 'enemy-tribes.json', message: 'ghosts: brak tekstu "rank.wraith" w słowniku' },
    ]);
  });

  it('krwawienie i trucizna wykluczają się u jednej jednostki', () => {
    const both = {
      ...unit,
      traits: [
        { type: 'bleed', damage: 30, duration: 10 },
        { type: 'poison', damage: 10, duration: 4 },
      ],
    };
    expect(messages(withHeroes([both]))).toEqual([
      'units/heroes.json: swordsman: cechy "bleed" i "poison" wykluczają się',
    ]);
  });
});

describe('validateContent', () => {
  it('treść gry jest poprawna', () => {
    expect(validateContent()).toEqual([]);
  });

  it('wymaga nazwy każdego szczepu (linii) w słowniku', () => {
    const nameless = [
      {
        id: 'nameless',
        price: 100,
        starter: true,
        forms: [{ unit: 'swordsman', upgradeCosts: [1, 2, 3, 4] }],
      },
    ];
    const issues = validateContent({ ...withHeroes([unit]), 'lines.json': nameless });
    expect(issues).toContainEqual({
      source: 'lines.json',
      message: 'nameless: brak tekstu "line.nameless.name" w słowniku',
    });
  });

  it('wymaga nazwy każdej jednostki w słowniku i przynależności bohatera do linii', () => {
    const issues = validateContent(withHeroes([{ ...unit, id: 'nameless' }]));
    expect(issues).toEqual([
      {
        source: 'units/heroes.json',
        message: 'nameless: brak tekstu "unit.nameless.name" w słowniku',
      },
      { source: 'units/heroes.json', message: 'nameless: nie należy do żadnej linii' },
      { source: 'lines.json', message: 'żadna linia nie jest startowa' },
    ]);
  });
});
