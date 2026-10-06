import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import { validateSetup } from '../sim/index.ts';
import {
  allUnitIds,
  battleFromSetupJson,
  buildBattle,
  configFromQuery,
  DEFAULT_CONFIG,
  formatTeam,
  parseTeam,
} from './sandbox-config.ts';

const content = requireContent();

describe('zapis drużyny w adresie', () => {
  it('zapisuje sloty po kolei i obcina puste na końcu', () => {
    expect(formatTeam(DEFAULT_CONFIG.player)).toBe(
      'swordsman_a.4,swordsman_b.0,archer_a.4,archer_b.0',
    );
    expect(formatTeam([null, { unit: 'brute', rank: 2 }, null, null, null])).toBe('-,brute.2');
    expect(formatTeam([])).toBe('-');
  });

  it('odczyt odwraca zapis', () => {
    const team = parseTeam(content, formatTeam(DEFAULT_CONFIG.enemy));
    expect(team).toEqual(DEFAULT_CONFIG.enemy);
    expect(parseTeam(content, '-,brute.2')).toEqual([
      null,
      { unit: 'brute', rank: 2 },
      null,
      null,
      null,
    ]);
  });

  it('nieznana jednostka albo błędna ranga daje pusty slot', () => {
    expect(parseTeam(content, 'dragon.1,brute.x,brute.-1,brute,archer_a.2.5')).toEqual([
      null,
      null,
      null,
      { unit: 'brute', rank: 0 },
      { unit: 'archer_a', rank: 2 },
    ]);
  });

  it('brak parametrów daje konfigurację domyślną', () => {
    expect(configFromQuery(content, new URLSearchParams(''))).toEqual(DEFAULT_CONFIG);
    const custom = configFromQuery(content, new URLSearchParams('player=brute.1&enemy=archer_b.3'));
    expect(custom.player[0]).toEqual({ unit: 'brute', rank: 1 });
    expect(custom.enemy[0]).toEqual({ unit: 'archer_b', rank: 3 });
  });
});

describe('buildBattle', () => {
  it('buduje poprawny setup i wygląd jednostek pod ich unitId', () => {
    const { setup, visuals } = buildBattle(content, DEFAULT_CONFIG);
    expect(validateSetup(setup)).toEqual([]);
    expect(setup.player[0]?.maxHp).toBe(840);
    expect(setup.player[4]).toBeNull();
    expect(setup.enemy[0]?.maxHp).toBe(1040);
    expect(visuals).toHaveLength(10);
    expect(visuals[0]?.skin).toBe('swordsman_a');
    expect(visuals[4]).toBeNull();
    expect(visuals[5]?.skin).toBe('brute');
    expect(visuals[8]).toBeNull();
  });

  it('pozwala postawić dowolną jednostkę po dowolnej stronie', () => {
    const { setup, visuals } = buildBattle(content, {
      player: [{ unit: 'brute', rank: 0 }],
      enemy: [{ unit: 'archer_b', rank: 2 }],
    });
    expect(setup.player[0]?.maxHp).toBe(800);
    expect(setup.enemy[0]?.pierce).toBe(true);
    expect(visuals[5]?.skin).toBe('archer_b');
  });

  it('lista jednostek obejmuje bohaterów i wrogów', () => {
    expect(allUnitIds(content)).toEqual([
      // Szczep Mieczników w kolejności drzewa.
      'swordsman_a',
      'swordsman_b',
      'guard_a',
      'swordsman_b2',
      'berserker',
      'guard_b',
      'pavise_guard',
      // Szczep Łuczników.
      'archer_a',
      'archer_b',
      'cleric_a',
      'archer_b2',
      'hunter',
      'cleric_b',
      'inquisitor',
      // Szczep Beasts.
      'monstrosity',
      'batfang',
      'reaper',
      'spiker',
      'ironbeak',
      'tuskovator',
      'ignitix',
      // Szczepy Immortals, Plants i Robots.
      'orb',
      'cardinal',
      'guardian_of_hell',
      'polaris',
      'ultimus',
      'xartix',
      'enigmatix',
      'bush',
      'trunk',
      'ivy',
      'oak_warrior',
      'mother_tree',
      'ice_ivy',
      'toxic_ivy',
      'bot',
      'egzo_bot',
      'holo_bot',
      'thermobot',
      'ax_bot',
      'whirl_bot',
      'titan_bot',
      'brute',
      'raider',
      'shaman',
      'chieftain',
    ]);
  });
});

describe('battleFromSetupJson', () => {
  const { setup } = buildBattle(content, {
    player: [
      { unit: 'swordsman_a', rank: 0 },
      { unit: 'archer_a', rank: 0 },
    ],
    enemy: [{ unit: 'brute', rank: 0 }],
  });

  it('odtwarza walkę z JSON-a i dobiera wygląd zastępczy po rodzaju ataku', () => {
    const battle = battleFromSetupJson(content, JSON.stringify(setup));
    expect(battle?.setup).toEqual(setup);
    expect(battle?.visuals[0]?.attackClip).toBe('slash');
    expect(battle?.visuals[1]?.attackClip).toBe('shoot');
    expect(battle?.visuals[2]).toBeNull();
    expect(battle?.visuals[5]?.attackClip).toBe('slash');
  });

  it('odtwarza walkę z przyzywaczem: specyfikacja przyzywanego wraca z JSON-a razem z wyglądem', () => {
    const summoning = buildBattle(content, {
      player: [{ unit: 'mother_tree', rank: 2 }],
      enemy: [{ unit: 'brute', rank: 0 }],
    }).setup;
    expect(summoning.player[0]?.summon).toMatchObject({ maxHp: 120, attack: 24 });
    const battle = battleFromSetupJson(content, JSON.stringify(summoning));
    expect(battle?.setup).toEqual(summoning);
    expect(battle?.visuals[0]?.summon?.attackClip).toBe('slash');
    // Wejście z raportu starszej wersji gry nie ma pola summon: jednostka nic nie przyzywa.
    const { summon: _, ...legacy } = setup.player[0] ?? { summon: null };
    const old = { ...setup, player: [legacy, null, null, null, null] };
    expect(battleFromSetupJson(content, JSON.stringify(old))?.setup.player[0]?.summon).toBeNull();
  });

  it('odrzuca niepoprawny JSON, zły kształt i setup łamiący niezmienniki symulacji', () => {
    expect(battleFromSetupJson(content, 'nie json')).toBeNull();
    expect(battleFromSetupJson(content, '{"arena":1}')).toBeNull();
    const broken = { ...setup, player: [{ ...setup.player[0], maxHp: 0 }, null, null, null, null] };
    expect(battleFromSetupJson(content, JSON.stringify(broken))).toBeNull();
  });
});
