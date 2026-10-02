import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import { levelSetup, resolveUnitSpec } from '../content/resolve-spec.ts';
import { validateSetup } from '../sim/index.ts';
import {
  applyEvolve,
  applyUpgrade,
  applyVictory,
  equipRune,
  evolveCost,
  freeRunes,
  isLevelUnlocked,
  isSquadEmpty,
  levelOrder,
  lineView,
  newSave,
  nextLevel,
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
  it('daje linie startowe bez ulepszeń, ustawione w składzie od frontu', () => {
    const save = fresh();
    expect(save.gold).toBe(0);
    expect(Object.keys(save.lines)).toEqual(['swordsman', 'archer']);
    expect(save.lines.swordsman).toEqual({ form: 0, upgrades: 0, runes: [null, null] });
    expect(save.squad).toEqual(['swordsman', 'archer', null, null, null]);
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
  });

  it('wygrana odblokowuje następny poziom, a przeszłe zostają dostępne', () => {
    const save = cleared(['w1_l1', 'w1_l2']);
    expect(levelOrder(content).filter((id) => isLevelUnlocked(content, save, id))).toEqual([
      'w1_l1',
      'w1_l2',
      'w1_l3',
    ]);
    expect(nextLevel(content, 'w1_l2')).toBe('w1_l3');
    expect(nextLevel(content, 'w1_l6')).toBeNull();
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
      lines: [],
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
      lines: [],
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

  it('odblokowuje linię przypisaną do poziomu, tylko przy pierwszym przejściu', () => {
    const lines = new Map(content.lines);
    const archer = content.lines.get('archer');
    if (archer === undefined) throw new Error('missing line');
    lines.set('archer', { ...archer, unlockLevel: 'w1_l1' });
    const gated = { ...content, lines };

    const save = newSave(gated, '0.0.0', 'pl');
    expect(Object.keys(save.lines)).toEqual(['swordsman']);
    expect(victoryRewards(gated, save, 'w1_l1')?.lines).toEqual(['archer']);
    const won = applyVictory(gated, save, 'w1_l1', 500);
    expect(won?.save.lines.archer).toEqual({ form: 0, upgrades: 0, runes: [null, null] });
    // Nowa linia nie wchodzi sama do składu: gracz decyduje o ustawieniu.
    expect(won?.save.squad).toEqual(['swordsman', null, null, null, null]);
    expect(won && victoryRewards(gated, won.save, 'w1_l1')?.lines).toEqual([]);
  });
});

describe('ulepszenia i ewolucja', () => {
  const rich = (gold: number): Save => ({ ...fresh(), gold });

  it('ulepszenie kosztuje kolejne kwoty z danych linii', () => {
    let save = rich(1000);
    const paid: number[] = [];
    for (let i = 0; i < 4; i++) {
      const cost = upgradeCost(content, save, 'swordsman');
      const next = applyUpgrade(content, save, 'swordsman');
      if (cost === null || next === null) throw new Error('upgrade refused');
      paid.push(cost);
      save = next;
    }
    expect(paid).toEqual([50, 80, 120, 180]);
    expect(save.gold).toBe(1000 - 430);
    expect(save.lines.swordsman?.upgrades).toBe(4);
    expect(upgradeCost(content, save, 'swordsman')).toBeNull();
    expect(applyUpgrade(content, save, 'swordsman')).toBeNull();
  });

  it('bez złota nie da się ulepszyć', () => {
    expect(applyUpgrade(content, rich(49), 'swordsman')).toBeNull();
    expect(applyUpgrade(content, rich(50), 'swordsman')?.gold).toBe(0);
    expect(applyUpgrade(content, rich(500), 'nie_ma')).toBeNull();
  });

  it('ewolucja jest dostępna dopiero po czterech ulepszeniach formy bazowej', () => {
    let save = rich(2000);
    for (let i = 0; i < 3; i++) {
      expect(evolveCost(content, save, 'swordsman')).toBeNull();
      expect(applyEvolve(content, save, 'swordsman')).toBeNull();
      save = applyUpgrade(content, save, 'swordsman') ?? save;
    }
    expect(evolveCost(content, save, 'swordsman')).toBeNull();
    save = applyUpgrade(content, save, 'swordsman') ?? save;
    expect(evolveCost(content, save, 'swordsman')).toBe(250);

    const evolved = applyEvolve(content, save, 'swordsman');
    expect(evolved?.gold).toBe(save.gold - 250);
    expect(evolved?.lines.swordsman).toEqual({ form: 1, upgrades: 0, runes: [null, null] });
    // Forma druga ma własne ulepszenia i nie ewoluuje dalej.
    expect(evolved && upgradeCost(content, evolved, 'swordsman')).toBe(300);
    expect(evolved && evolveCost(content, evolved, 'swordsman')).toBeNull();
  });

  it('ewolucja wymaga złota i zachowuje runy', () => {
    let save: Save = { ...rich(430), runes: ['rune_hp_200'] };
    save = equipRune(content, save, 'swordsman', 1, 'rune_hp_200') ?? save;
    for (let i = 0; i < 4; i++) save = applyUpgrade(content, save, 'swordsman') ?? save;
    expect(save.gold).toBe(0);
    expect(applyEvolve(content, save, 'swordsman')).toBeNull();
    const evolved = applyEvolve(content, { ...save, gold: 250 }, 'swordsman');
    expect(evolved?.lines.swordsman?.runes).toEqual([null, 'rune_hp_200']);
  });
});

describe('runy', () => {
  const withRunes = (): Save => ({ ...fresh(), runes: ['rune_attack_25', 'rune_hp_200'] });

  it('wkłada wolną runę do slotu i zdejmuje ją z listy wolnych', () => {
    const save = equipRune(content, withRunes(), 'archer', 0, 'rune_attack_25');
    expect(save?.lines.archer?.runes).toEqual(['rune_attack_25', null]);
    expect(save && freeRunes(save)).toEqual(['rune_hp_200']);
  });

  it('runy włożonej jednemu bohaterowi nie da się włożyć drugiemu bez wyjęcia', () => {
    const save = equipRune(content, withRunes(), 'archer', 0, 'rune_attack_25');
    if (save === null) throw new Error('equip refused');
    expect(equipRune(content, save, 'swordsman', 0, 'rune_attack_25')).toBeNull();
    const emptied = equipRune(content, save, 'archer', 0, null);
    expect(emptied && freeRunes(emptied)).toEqual(['rune_attack_25', 'rune_hp_200']);
    expect(emptied && equipRune(content, emptied, 'swordsman', 0, 'rune_attack_25')).not.toBeNull();
  });

  it('dwie takie same runy da się włożyć dwóm bohaterom', () => {
    let save: Save = { ...fresh(), runes: ['rune_attack_25', 'rune_attack_25'] };
    save = equipRune(content, save, 'archer', 0, 'rune_attack_25') ?? save;
    save = equipRune(content, save, 'swordsman', 1, 'rune_attack_25') ?? save;
    expect(freeRunes(save)).toEqual([]);
    expect(equipRune(content, save, 'swordsman', 0, 'rune_attack_25')).toBeNull();
  });

  it('zamiana runy w slocie zwraca poprzednią do wolnych', () => {
    let save = equipRune(content, withRunes(), 'archer', 0, 'rune_attack_25');
    save = save && equipRune(content, save, 'archer', 0, 'rune_hp_200');
    expect(save?.lines.archer?.runes).toEqual(['rune_hp_200', null]);
    expect(save && freeRunes(save)).toEqual(['rune_attack_25']);
  });

  it('odrzuca slot spoza zakresu, nieznaną linię i runę, której gracz nie ma', () => {
    expect(equipRune(content, withRunes(), 'archer', 2, 'rune_hp_200')).toBeNull();
    expect(equipRune(content, withRunes(), 'archer', -1, 'rune_hp_200')).toBeNull();
    expect(equipRune(content, withRunes(), 'nie_ma', 0, 'rune_hp_200')).toBeNull();
    expect(equipRune(content, fresh(), 'archer', 0, 'rune_hp_200')).toBeNull();
  });

  it('podgląd statystyk równa się temu, co liczy resolveUnitSpec', () => {
    let save: Save = { ...withRunes(), gold: 1000 };
    save = applyUpgrade(content, save, 'archer') ?? save;
    save = applyUpgrade(content, save, 'archer') ?? save;
    save = equipRune(content, save, 'archer', 0, 'rune_attack_25') ?? save;
    save = equipRune(content, save, 'archer', 1, 'rune_hp_200') ?? save;

    const view = lineView(content, save, 'archer');
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
    const save = placeInSquad(fresh(), 'archer', 3);
    expect(save?.squad).toEqual(['swordsman', null, null, 'archer', null]);
  });

  it('zamienia miejscami dwóch bohaterów ze składu', () => {
    expect(placeInSquad(fresh(), 'archer', 0)?.squad).toEqual([
      'archer',
      'swordsman',
      null,
      null,
      null,
    ]);
  });

  it('bohater spoza składu zajmuje slot, a poprzedni z niego wypada', () => {
    const benched = removeFromSquad(fresh(), 1);
    expect(benched.squad).toEqual(['swordsman', null, null, null, null]);
    expect(placeInSquad(benched, 'archer', 0)?.squad).toEqual(['archer', null, null, null, null]);
  });

  it('odrzuca nieznaną linię i slot spoza zakresu', () => {
    expect(placeInSquad(fresh(), 'nie_ma', 0)).toBeNull();
    expect(placeInSquad(fresh(), 'archer', 5)).toBeNull();
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

  it('usuwa linie, runy i poziomy, których nie ma już w treści gry', () => {
    const save: Save = {
      ...fresh(),
      lines: {
        swordsman: { form: 1, upgrades: 9, runes: ['rune_dawna', 'rune_hp_200', 'rune_hp_200'] },
        dawna_linia: { form: 0, upgrades: 1, runes: [null, null] },
      },
      runes: ['rune_dawna', 'rune_hp_200'],
      levels: { w1_l1: { cleared: true, bestTicks: 300 }, dawny: { cleared: true, bestTicks: 1 } },
      squad: ['dawna_linia', 'swordsman', 'swordsman', null, null],
    };
    const fixed = reconcileSave(content, save);
    expect(fixed.runes).toEqual(['rune_hp_200']);
    expect(Object.keys(fixed.levels)).toEqual(['w1_l1']);
    // Ulepszenia przycięte do maksimum, runy do liczby slotów i do posiadanych sztuk.
    expect(fixed.lines.swordsman).toEqual({ form: 1, upgrades: 4, runes: [null, 'rune_hp_200'] });
    // Linia startowa, której zapis nie miał, wraca.
    expect(fixed.lines.archer).toEqual({ form: 0, upgrades: 0, runes: [null, null] });
    expect(fixed.lines.dawna_linia).toBeUndefined();
    expect(fixed.squad).toEqual([null, 'swordsman', null, null, null]);
  });

  it('runa włożona dwóm bohaterom przy jednej posiadanej sztuce zostaje u pierwszego', () => {
    const save: Save = {
      ...fresh(),
      runes: ['rune_attack_25'],
      lines: {
        swordsman: { form: 0, upgrades: 0, runes: ['rune_attack_25', null] },
        archer: { form: 0, upgrades: 0, runes: ['rune_attack_25', null] },
      },
    };
    const fixed = reconcileSave(content, save);
    expect(fixed.lines.swordsman?.runes).toEqual(['rune_attack_25', null]);
    expect(fixed.lines.archer?.runes).toEqual([null, null]);
  });
});
