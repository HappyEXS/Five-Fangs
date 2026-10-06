import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import { levelSetup, resolveUnitSpec } from '../content/resolve-spec.ts';
import { validateSetup } from '../sim/index.ts';
import {
  applyUpgrade,
  applyVictory,
  buyHero,
  currentLevel,
  equipRune,
  freeRunes,
  heroView,
  isLevelUnlocked,
  isSquadEmpty,
  levelOrder,
  newSave,
  nextLevel,
  ownedCount,
  placeInSquad,
  reconcileSave,
  removeFromSquad,
  squadMembers,
  upgradeCost,
  victoryRewards,
} from './progress.ts';
import type { Save } from './save-schema.ts';

const content = requireContent();
const fresh = (): Save => newSave(content, '0.0.0', 'pl');
// W nowej grze miecznik ma id 1, łucznik id 2.
const SWORD = 1;
const ARCHER = 2;

/** Zapis po wygraniu podanych poziomów po kolei. */
function cleared(levels: readonly string[], from: Save = fresh()): Save {
  let save = from;
  for (const level of levels) {
    const result = applyVictory(content, save, level, 500);
    if (result === null) throw new Error(`cannot clear ${level}`);
    save = result.save;
  }
  return save;
}

describe('newSave', () => {
  it('daje po jednym bohaterze każdej linii startowej, ustawionych w składzie od frontu', () => {
    const save = fresh();
    expect(save.gold).toBe(0);
    expect(save.heroes).toEqual([
      { id: 1, line: 'swordsman', form: 'swordsman_a', upgrades: 0, runes: [null, null] },
      { id: 2, line: 'archer', form: 'archer_a', upgrades: 0, runes: [null, null] },
    ]);
    expect(save.nextHeroId).toBe(3);
    expect(save.squad).toEqual([1, 2, null, null, null]);
    expect(save.settings).toEqual({ lang: 'pl', battleSpeed: 1 });
  });

  it('skład nowej gry daje poprawne wejście symulacji dla pierwszego poziomu', () => {
    const level = content.levels.get('w1_l1');
    if (level === undefined) throw new Error('missing level');
    const setup = levelSetup(content, level, squadMembers(content, fresh()));
    expect(validateSetup(setup)).toEqual([]);
    expect(setup.player.filter((unit) => unit !== null)).toHaveLength(2);
  });
});

describe('odblokowywanie poziomów', () => {
  it('na początku dostępny jest tylko pierwszy poziom', () => {
    const save = fresh();
    expect(levelOrder(content).filter((id) => isLevelUnlocked(content, save, id))).toEqual([
      'w1_l1',
    ]);
    expect(isLevelUnlocked(content, save, 'nie_ma')).toBe(false);
    expect(currentLevel(content, save)).toBe('w1_l1');
  });

  it('wygrana odblokowuje następny poziom, a przeszłe zostają dostępne', () => {
    const save = cleared(['w1_l1', 'w1_l2']);
    expect(levelOrder(content).filter((id) => isLevelUnlocked(content, save, id))).toEqual([
      'w1_l1',
      'w1_l2',
      'w1_l3',
    ]);
    expect(currentLevel(content, save)).toBe('w1_l3');
    expect(nextLevel(content, 'w1_l2')).toBe('w1_l3');
    expect(nextLevel(content, 'w1_l6')).toBeNull();
  });

  it('po przejściu wszystkich poziomów bieżącym zostaje ostatni', () => {
    const save = cleared(levelOrder(content));
    expect(currentLevel(content, save)).toBe('w1_l6');
  });

  it('zablokowanego poziomu nie da się zaliczyć', () => {
    expect(applyVictory(content, fresh(), 'w1_l3', 500)).toBeNull();
    expect(applyVictory(content, fresh(), 'nie_ma', 500)).toBeNull();
  });
});

describe('nagrody', () => {
  it('pierwsze przejście daje pełne złoto i runę poziomu', () => {
    const before = cleared(['w1_l1']);
    expect(victoryRewards(content, before, 'w1_l2')).toEqual({
      firstClear: true,
      gold: 400,
      rune: 'rune_hp_100',
    });
    const after = cleared(['w1_l2'], before);
    expect(after.gold).toBe(100 + 400);
    expect(after.runes).toEqual(['rune_hp_100']);
    expect(after.levels.w1_l2).toEqual({ cleared: true, bestTicks: 500 });
  });

  it('powtórka daje 25% złota zaokrąglone w dół i nic poza tym', () => {
    const save = cleared(['w1_l1', 'w1_l2']);
    expect(victoryRewards(content, save, 'w1_l2')).toEqual({
      firstClear: false,
      gold: 100,
      rune: null,
    });
    const again = applyVictory(content, save, 'w1_l2', 450);
    expect(again?.save.gold).toBe(500 + 100);
    expect(again?.save.runes).toEqual(['rune_hp_100']);
  });

  it('zapamiętuje najkrótszą wygraną', () => {
    const save = cleared(['w1_l1']);
    expect(applyVictory(content, save, 'w1_l1', 450)?.save.levels.w1_l1?.bestTicks).toBe(450);
    expect(applyVictory(content, save, 'w1_l1', 900)?.save.levels.w1_l1?.bestTicks).toBe(500);
  });
});

describe('sklep', () => {
  const rich = (gold: number): Save => ({ ...fresh(), gold });

  it('kupuje bohatera nowej linii: forma bazowa, nowe id, pierwszy wolny slot składu', () => {
    const save = buyHero(content, rich(500), 'beasts');
    expect(save?.gold).toBe(500 - 200);
    expect(save?.heroes[2]).toEqual({
      id: 3,
      line: 'beasts',
      form: 'monstrosity',
      upgrades: 0,
      runes: [null, null],
    });
    expect(save?.nextHeroId).toBe(4);
    expect(save?.squad).toEqual([1, 2, 3, null, null]);
  });

  it('pozwala kupić kolejny egzemplarz posiadanej linii, z własnym stanem', () => {
    let save = applyUpgrade(content, rich(1000), SWORD) ?? rich(1000);
    save = buyHero(content, save, 'swordsman') ?? save;
    expect(ownedCount(save, 'swordsman')).toBe(2);
    expect(save.heroes.filter((hero) => hero.line === 'swordsman')).toEqual([
      { id: 1, line: 'swordsman', form: 'swordsman_a', upgrades: 1, runes: [null, null] },
      { id: 3, line: 'swordsman', form: 'swordsman_a', upgrades: 0, runes: [null, null] },
    ]);
    // Ulepszenie drugiego egzemplarza nie rusza pierwszego.
    save = applyUpgrade(content, save, 3) ?? save;
    save = applyUpgrade(content, save, 3) ?? save;
    expect(save.heroes.map((hero) => hero.upgrades)).toEqual([1, 0, 2]);
  });

  it('przy pełnym składzie bohater trafia poza skład', () => {
    let save = rich(5000);
    for (const line of ['beasts', 'plants', 'archer']) save = buyHero(content, save, line) ?? save;
    expect(save.squad).toEqual([1, 2, 3, 4, 5]);
    save = buyHero(content, save, 'beasts') ?? save;
    expect(save.heroes).toHaveLength(6);
    expect(save.squad).toEqual([1, 2, 3, 4, 5]);
  });

  it('odmawia bez złota i dla nieznanej linii', () => {
    expect(buyHero(content, rich(199), 'beasts')).toBeNull();
    expect(buyHero(content, rich(200), 'beasts')?.gold).toBe(0);
    expect(buyHero(content, rich(9999), 'nie_ma')).toBeNull();
  });
});

describe('ulepszenia i ewolucja', () => {
  const rich = (gold: number): Save => ({ ...fresh(), gold });

  it('ulepszenie kosztuje kolejne kwoty z danych linii', () => {
    let save = rich(1000);
    const paid: number[] = [];
    for (let i = 0; i < 4; i++) {
      const cost = upgradeCost(content, save, SWORD);
      const next = applyUpgrade(content, save, SWORD);
      if (cost === null || next === null) throw new Error('upgrade refused');
      paid.push(cost);
      save = next;
    }
    expect(paid).toEqual([50, 80, 120, 180]);
    expect(save.gold).toBe(1000 - 430);
    expect(save.heroes[0]?.upgrades).toBe(4);
    expect(upgradeCost(content, save, SWORD)).toBeNull();
    expect(applyUpgrade(content, save, SWORD)).toBeNull();
  });

  it('bez złota nie da się ulepszyć', () => {
    expect(applyUpgrade(content, rich(49), SWORD)).toBeNull();
    expect(applyUpgrade(content, rich(50), SWORD)?.gold).toBe(0);
    expect(applyUpgrade(content, rich(500), 99)).toBeNull();
  });
});

describe('runy', () => {
  const withRunes = (): Save => ({ ...fresh(), runes: ['rune_attack_25', 'rune_hp_200'] });

  it('wkłada wolną runę do slotu i zdejmuje ją z listy wolnych', () => {
    const save = equipRune(content, withRunes(), ARCHER, 0, 'rune_attack_25');
    expect(save?.heroes[1]?.runes).toEqual(['rune_attack_25', null]);
    expect(save && freeRunes(save)).toEqual(['rune_hp_200']);
  });

  it('runy włożonej jednemu bohaterowi nie da się włożyć drugiemu bez wyjęcia', () => {
    const save = equipRune(content, withRunes(), ARCHER, 0, 'rune_attack_25');
    if (save === null) throw new Error('equip refused');
    expect(equipRune(content, save, SWORD, 0, 'rune_attack_25')).toBeNull();
    const emptied = equipRune(content, save, ARCHER, 0, null);
    expect(emptied && freeRunes(emptied)).toEqual(['rune_attack_25', 'rune_hp_200']);
    expect(emptied && equipRune(content, emptied, SWORD, 0, 'rune_attack_25')).not.toBeNull();
  });

  it('dwie takie same runy da się włożyć dwóm bohaterom', () => {
    let save: Save = { ...fresh(), runes: ['rune_attack_25', 'rune_attack_25'] };
    save = equipRune(content, save, ARCHER, 0, 'rune_attack_25') ?? save;
    save = equipRune(content, save, SWORD, 1, 'rune_attack_25') ?? save;
    expect(freeRunes(save)).toEqual([]);
    expect(equipRune(content, save, SWORD, 0, 'rune_attack_25')).toBeNull();
  });

  it('zamiana runy w slocie zwraca poprzednią do wolnych', () => {
    let save = equipRune(content, withRunes(), ARCHER, 0, 'rune_attack_25');
    save = save && equipRune(content, save, ARCHER, 0, 'rune_hp_200');
    expect(save?.heroes[1]?.runes).toEqual(['rune_hp_200', null]);
    expect(save && freeRunes(save)).toEqual(['rune_attack_25']);
  });

  it('odrzuca slot spoza zakresu, nieznanego bohatera i runę, której gracz nie ma', () => {
    expect(equipRune(content, withRunes(), ARCHER, 2, 'rune_hp_200')).toBeNull();
    expect(equipRune(content, withRunes(), ARCHER, -1, 'rune_hp_200')).toBeNull();
    expect(equipRune(content, withRunes(), 99, 0, 'rune_hp_200')).toBeNull();
    expect(equipRune(content, fresh(), ARCHER, 0, 'rune_hp_200')).toBeNull();
  });

  it('podgląd statystyk równa się temu, co liczy resolveUnitSpec', () => {
    let save: Save = { ...withRunes(), gold: 1000 };
    save = applyUpgrade(content, save, ARCHER) ?? save;
    save = applyUpgrade(content, save, ARCHER) ?? save;
    save = equipRune(content, save, ARCHER, 0, 'rune_attack_25') ?? save;
    save = equipRune(content, save, ARCHER, 1, 'rune_hp_200') ?? save;

    const view = heroView(content, save, ARCHER);
    const unit = content.heroes.get('archer_a');
    const runes = [content.runes.get('rune_attack_25'), content.runes.get('rune_hp_200')];
    if (view === null || unit === undefined || runes.includes(undefined)) throw new Error('setup');
    const expected = resolveUnitSpec(
      unit,
      2,
      runes.filter((rune) => rune !== undefined),
      content.progression,
    );
    expect(view.spec).toEqual(expected);
    // 350 HP i 30 ataku + 20% + runy.
    expect(view.spec.maxHp).toBe(420 + 200);
    expect(view.spec.attack).toBe(36 + 25);
    expect(squadMembers(content, save)[1]).toEqual({ unit, rank: 2, runes: view.runes });
  });
});

describe('skład', () => {
  it('przestawia bohatera na pusty slot', () => {
    expect(placeInSquad(fresh(), ARCHER, 3)?.squad).toEqual([1, null, null, 2, null]);
  });

  it('zamienia miejscami dwóch bohaterów ze składu', () => {
    expect(placeInSquad(fresh(), ARCHER, 0)?.squad).toEqual([2, 1, null, null, null]);
  });

  it('bohater spoza składu zajmuje slot, a poprzedni z niego wypada', () => {
    const benched = removeFromSquad(fresh(), 1);
    expect(benched.squad).toEqual([1, null, null, null, null]);
    expect(placeInSquad(benched, ARCHER, 0)?.squad).toEqual([2, null, null, null, null]);
  });

  it('w składzie może stać kilku bohaterów tej samej linii', () => {
    const save = buyHero(content, { ...fresh(), gold: 200 }, 'swordsman');
    if (save === null) throw new Error('purchase refused');
    const members = squadMembers(content, save);
    expect(members.map((member) => member?.unit.id ?? null)).toEqual([
      'swordsman_a',
      'archer_a',
      'swordsman_a',
      null,
      null,
    ]);
  });

  it('odrzuca nieznanego bohatera i slot spoza zakresu', () => {
    expect(placeInSquad(fresh(), 99, 0)).toBeNull();
    expect(placeInSquad(fresh(), ARCHER, 5)).toBeNull();
  });

  it('rozpoznaje pusty skład', () => {
    expect(isSquadEmpty(fresh())).toBe(false);
    expect(isSquadEmpty(removeFromSquad(removeFromSquad(fresh(), 0), 1))).toBe(true);
  });
});

describe('reconcileSave', () => {
  it('nie zmienia zapisu zgodnego z treścią', () => {
    const save = cleared(['w1_l1', 'w1_l2']);
    expect(reconcileSave(content, save)).toEqual(save);
  });

  it('usuwa bohaterów, runy i poziomy, których nie ma już w treści gry', () => {
    const save: Save = {
      ...fresh(),
      heroes: [
        { id: 1, line: 'dawna_linia', form: 'dawna_a', upgrades: 1, runes: [null, null] },
        {
          id: 2,
          line: 'swordsman',
          form: 'swordsman_b',
          upgrades: 9,
          runes: ['rune_dawna', 'rune_hp_200', 'rune_hp_200'],
        },
        // Powtórzone id: zostaje pierwszy bohater.
        { id: 2, line: 'archer', form: 'archer_a', upgrades: 0, runes: [null, null] },
      ],
      nextHeroId: 2,
      runes: ['rune_dawna', 'rune_hp_200'],
      levels: { w1_l1: { cleared: true, bestTicks: 300 }, dawny: { cleared: true, bestTicks: 1 } },
      squad: [1, 2, 2, 7, null],
    };
    const fixed = reconcileSave(content, save);
    expect(fixed.runes).toEqual(['rune_hp_200']);
    expect(Object.keys(fixed.levels)).toEqual(['w1_l1']);
    // Ulepszenia przycięte do maksimum, runy do liczby slotów i do posiadanych sztuk.
    expect(fixed.heroes).toEqual([
      { id: 2, line: 'swordsman', form: 'swordsman_b', upgrades: 4, runes: [null, 'rune_hp_200'] },
    ]);
    // Następne id nie może powtórzyć istniejącego.
    expect(fixed.nextHeroId).toBe(3);
    expect(fixed.squad).toEqual([null, 2, null, null, null]);
  });

  it('forma spoza drzewa linii wraca do formy bazowej bez ulepszeń, runy zostają', () => {
    const save: Save = {
      ...fresh(),
      runes: ['rune_hp_200'],
      heroes: [
        {
          id: 1,
          line: 'swordsman',
          form: 'dawna_forma',
          upgrades: 3,
          runes: ['rune_hp_200', null],
        },
        { id: 2, line: 'archer', form: 'swordsman_b', upgrades: 2, runes: [null, null] },
      ],
    };
    const fixed = reconcileSave(content, save);
    expect(fixed.heroes.map((hero) => [hero.form, hero.upgrades, hero.runes[0]])).toEqual([
      ['swordsman_a', 0, 'rune_hp_200'],
      // Forma z innej linii też nie należy do drzewa łucznika.
      ['archer_a', 0, null],
    ]);
  });

  it('runa włożona dwóm bohaterom przy jednej posiadanej sztuce zostaje u pierwszego', () => {
    const base = fresh();
    const save: Save = {
      ...base,
      runes: ['rune_attack_25'],
      heroes: base.heroes.map((hero) => ({ ...hero, runes: ['rune_attack_25', null] })),
    };
    const fixed = reconcileSave(content, save);
    expect(fixed.heroes[0]?.runes).toEqual(['rune_attack_25', null]);
    expect(fixed.heroes[1]?.runes).toEqual([null, null]);
  });

  it('zapis bez żadnego bohatera dostaje bohaterów startowych', () => {
    const save: Save = {
      ...fresh(),
      gold: 77,
      heroes: [{ id: 4, line: 'dawna_linia', form: 'dawna_a', upgrades: 0, runes: [null, null] }],
      nextHeroId: 5,
      squad: [4, null, null, null, null],
    };
    const fixed = reconcileSave(content, save);
    expect(fixed.gold).toBe(77);
    expect(fixed.heroes.map((hero) => [hero.id, hero.line])).toEqual([
      [5, 'swordsman'],
      [6, 'archer'],
    ]);
    expect(fixed.squad).toEqual([5, 6, null, null, null]);
    expect(fixed.nextHeroId).toBe(7);
  });
});
