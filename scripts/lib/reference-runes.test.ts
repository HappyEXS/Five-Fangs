import { describe, expect, it } from 'vitest';
import { requireContent } from '../../src/content/load.ts';
import type { Rune } from '../../src/content/load-progression.ts';
import { levelOrder, runBalance } from './balance.ts';
import { type Reference, squadForGold } from './reference-plan.ts';
import { assignRunes, runesForTokens, tokensBefore } from './reference-runes.ts';
import { loadReference } from './reference-squads.ts';
import { runePaths, runPaths } from './rune-paths.ts';

const content = requireContent();
const reference: Reference = loadReference(content).reference ?? { squad: [], runes: ['hp'] };
const levels = levelOrder(content);

const rune = (id: string): Rune => {
  const found = content.runes.get(id);
  if (found === undefined) throw new Error(id);
  return found;
};
const ids = (runes: readonly Rune[]): string[] => runes.map((entry) => entry.id);

describe('żetony run przed poziomem', () => {
  it('liczy poziomy z żetonem przeszłe wcześniej', () => {
    expect([0, 1, 2, 4, 5, 6, 8].map((index) => tokensBefore(levels, index))).toEqual([
      0, 0, 1, 1, 2, 2, 3,
    ]);
    expect(tokensBefore(levels, levels.length)).toBe(12);
  });
});

describe('runesForTokens', () => {
  it('plan odniesienia bierze na zmianę następną runę życia i następną runę ataku', () => {
    expect(runesForTokens(content, [reference.runes], 0)).toEqual([]);
    expect(ids(runesForTokens(content, [reference.runes], 5))).toEqual([
      'hp_1',
      'attack_1',
      'hp_2',
      'attack_2',
      'hp_3',
    ]);
    // Dwanaście żetonów całej gry to oba kierunki do końca.
    const all = ids(runesForTokens(content, [reference.runes], 12));
    expect(all).toHaveLength(12);
    expect(all.at(-2)).toBe('hp_6');
    expect(all.at(-1)).toBe('attack_6');
  });

  it('kierunek przeszły do końca jest pomijany, a po fazie zaczyna się następna', () => {
    // Najpierw cały odrzut, potem plan odniesienia.
    const first = ids(runesForTokens(content, [['knockback'], ['hp', 'attack']], 8));
    expect(first).toEqual([
      'knockback_1',
      'knockback_2',
      'knockback_3',
      'knockback_4',
      'knockback_5',
      'knockback_6',
      'hp_1',
      'attack_1',
    ]);
    // Faza, która powtarza kierunek z poprzedniej, bierze z niego to, co zostało.
    const again = ids(runesForTokens(content, [['hp'], ['hp', 'attack']], 8));
    expect(again.slice(6)).toEqual(['attack_1', 'attack_2']);
  });

  it('żetony, na które plan nie ma już run, zostają niewydane', () => {
    expect(runesForTokens(content, [['speed']], 12)).toHaveLength(6);
    expect(runesForTokens(content, [['nie_ma']], 3)).toEqual([]);
    expect(runesForTokens(content, [], 3)).toEqual([]);
  });
});

describe('assignRunes', () => {
  const squad = squadForGold(content, reference, 600);
  const bySlot = (given: Rune[][]) =>
    Object.fromEntries(
      squad.members.map((member, index) => [member.slot, ids(given[index] ?? [])]),
    );

  it('życie idzie od frontu, atak od tyłu, najmocniejsze pierwsze', () => {
    const some = [rune('hp_1'), rune('attack_1'), rune('hp_2')];
    expect(bySlot(assignRunes(content, squad, some))).toEqual({
      0: ['hp_2'],
      1: ['hp_1'],
      2: [],
      3: [],
      4: ['attack_1'],
    });
  });

  it('bohater nie dostaje więcej run, niż ma gniazd; nadmiar zostaje', () => {
    const many = [...runesForTokens(content, [['hp'], ['attack']], 11)];
    const given = assignRunes(content, squad, many);
    expect(given.every((list) => list.length === 2)).toBe(true);
    // Jedenaście run na dziesięć gniazd: najsłabsza runa ataku zostaje niewłożona.
    expect(given.flat().map((entry) => entry.id)).not.toContain('attack_1');
    const duo = squadForGold(content, reference, 0);
    expect(assignRunes(content, duo, many).map((list) => list.length)).toEqual([2, 2]);
  });

  it('runa szybkości omija bohatera, który stoi w miejscu', () => {
    // Skład z Bushem na froncie: Bush się nie rusza, więc runę dostaje następny.
    const plants: Reference = {
      squad: [
        { slot: 1, line: 'swordsman' },
        { slot: 2, line: 'archer' },
        { slot: 0, line: 'plants' },
      ],
      runes: ['speed'],
    };
    const three = squadForGold(content, plants, 200);
    expect(three.members.map((member) => member.form)).toEqual(['swordsman_a', 'archer_a', 'bush']);
    const given = assignRunes(content, three, [rune('speed_1'), rune('speed_2')], {
      moveSpeed: 'front',
    });
    expect(given.map(ids)).toEqual([['speed_2'], ['speed_1'], []]);
    // Odrzut takiego ograniczenia nie ma.
    const push = assignRunes(content, three, [rune('knockback_1')], { knockback: 'front' });
    expect(push.map(ids)).toEqual([[], [], ['knockback_1']]);
  });

  it('rozdanie można zmienić: walczącym wręcz albo strzelcom', () => {
    // Od frontu: Miecznik, Orb, Łucznik, Bot, Monstrosity; wręcz walczą Miecznik, Bot i Monstrosity.
    const five = squadForGold(content, reference, 600);
    const forms = Object.fromEntries(five.members.map((member) => [member.slot, member.form]));
    expect(forms).toEqual({
      0: 'swordsman_a',
      1: 'orb',
      2: 'archer_a',
      3: 'bot',
      4: 'monstrosity',
    });
    const runes = [rune('knockback_3'), rune('knockback_2'), rune('knockback_1')];
    const slots = (given: Rune[][]) =>
      five.members
        .map((member, index) => ({ slot: member.slot, runes: ids(given[index] ?? []) }))
        .filter((entry) => entry.runes.length > 0)
        .sort((a, b) => a.slot - b.slot)
        .map((entry) => [entry.slot, entry.runes[0]]);
    expect(slots(assignRunes(content, five, runes, { knockback: 'melee' }))).toEqual([
      [0, 'knockback_3'],
      [3, 'knockback_2'],
      [4, 'knockback_1'],
    ]);
    expect(slots(assignRunes(content, five, runes, { knockback: 'ranged' }))).toEqual([
      [1, 'knockback_2'],
      [2, 'knockback_3'],
      [4, 'knockback_1'],
    ]);
    expect(slots(assignRunes(content, five, runes, { knockback: 'back' }))).toEqual([
      [2, 'knockback_1'],
      [3, 'knockback_2'],
      [4, 'knockback_3'],
    ]);
  });
});

describe('drogi przez drzewko run', () => {
  const reports = runBalance(content, reference);
  const paths = runePaths(content, reference);
  const rows = runPaths(content, reference, reports);

  it('porównuje plan odniesienia, każdy kierunek brany najpierw i wszystkie po równo', () => {
    expect(paths.map((path) => path.id)).toEqual([
      'reference',
      'hp',
      'attack',
      'knockback',
      'speed',
      'all',
    ]);
    expect(paths[3]?.phases).toEqual([['knockback'], ['hp', 'attack']]);
    expect(paths[5]?.phases).toEqual([['hp', 'attack', 'knockback', 'speed']]);
  });

  it('ma wiersz na każdy poziom wymagający run, z wynikiem każdej drogi', () => {
    expect(rows.map((row) => row.level)).toEqual(
      reports.filter((report) => report.needsRunes).map((report) => report.level),
    );
    for (const row of rows) expect(row.results).toHaveLength(paths.length);
  });

  it('plan odniesienia daje ten sam wynik co raport balansu', () => {
    for (const row of rows) {
      const report = reports.find((entry) => entry.level === row.level);
      expect(row.results[0]).toEqual({ ...report?.runed, holders: null });
      expect(row.tokens).toBe(report?.runes);
    }
  });

  it('odrzut i szybkość dostają najlepsze rozdanie, życie i atak rozdanie odniesienia', () => {
    for (const row of rows) {
      expect(row.results[1]?.holders, row.level).toBeNull();
      expect(row.results[2]?.holders, row.level).toBeNull();
      expect(row.results[3]?.holders, row.level).not.toBeNull();
      expect(row.results[4]?.holders, row.level).not.toBeNull();
      expect(row.results[5]?.holders, row.level).toBeNull();
    }
  });
});
