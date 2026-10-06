import { describe, expect, it } from 'vitest';
import { type GameContent, requireContent } from '../content/load.ts';
import type { CompiledLine } from '../content/load-progression.ts';
import { levelSetup } from '../content/resolve-spec.ts';
import { createBattle, validateSetup } from '../sim/index.ts';
import { newSave, squadMembers } from './progress.ts';
import { SQUAD_SLOTS } from './save-schema.ts';
import { arenaXAt } from './stage-geometry.ts';
import {
  formStands,
  SQUAD_FIELD_AT,
  shopStands,
  squadFieldSetup,
  standScene,
} from './stage-stands.ts';

const content = requireContent();

/** Treść gry z `count` liniami: kopie pierwszej linii pod kolejnymi id. */
function withLines(count: number): GameContent {
  const [first] = content.lines.values();
  if (first === undefined) throw new Error('content has no lines');
  const lines = new Map<string, CompiledLine>();
  for (let i = 0; i < count; i++) lines.set(`line_${i}`, { ...first, id: `line_${i}` });
  return { ...content, lines };
}

describe('shopStands', () => {
  it('stawia każdą linię z treści gry w kolejności z treści: osiem linii po cztery na stronę', () => {
    const stands = shopStands(content);
    expect(stands.map((stand) => stand.line)).toEqual([...content.lines.keys()]);
    expect(stands.map((stand) => stand.side)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
    expect(stands.map((stand) => stand.slot)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    // Równe odstępy przez całą scenę, także między lewą a prawą grupą: metki mają tyle samo
    // miejsca pod każdą postacią.
    const positions = stands.map((stand) => stand.position);
    expect(positions[0]).toBeCloseTo(0.08);
    expect(positions.at(-1)).toBeCloseTo(0.92);
    for (let i = 1; i < positions.length; i++) {
      expect((positions[i] ?? 0) - (positions[i - 1] ?? 0)).toBeCloseTo(0.12);
    }
    for (const stand of stands) {
      expect(stand.unitId).toBe(content.lines.get(stand.line)?.base);
    }
  });

  it('do pięciu linii stoi w jednym rzędzie po lewej stronie', () => {
    const stands = shopStands(withLines(5));
    expect(stands.every((stand) => stand.side === 0)).toBe(true);
    expect(stands.map((stand) => stand.slot)).toEqual([0, 1, 2, 3, 4]);
    expect(stands[0]?.position).toBeCloseTo(0.12);
    expect(stands.at(-1)?.position).toBeCloseTo(0.88);
  });

  it('jedną linię stawia na środku sceny', () => {
    expect(shopStands(withLines(1)).map((stand) => stand.position)).toEqual([0.5]);
  });

  it('ponad pięć linii dzieli na lewą i prawą stronę, rosnąco od lewej do prawej', () => {
    const stands = shopStands(withLines(7));
    expect(stands.map((stand) => stand.side)).toEqual([0, 0, 0, 0, 1, 1, 1]);
    expect(stands.map((stand) => stand.slot)).toEqual([0, 1, 2, 3, 0, 1, 2]);
    const positions = stands.map((stand) => stand.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(new Set(positions).size).toBe(7);
  });

  it('pomija linie, które nie mieszczą się na scenie', () => {
    expect(shopStands(withLines(SQUAD_SLOTS * 2 + 3))).toHaveLength(SQUAD_SLOTS * 2);
  });
});

describe('formStands', () => {
  it('stawia drogę ewolucji od lewej: formę bazową, wybraną i dalsze stopnie, wszystkie w prawo', () => {
    const stands = formStands(content, 'swordsman', 'swordsman_c');
    expect(stands.map((stand) => stand.unitId)).toEqual([
      'swordsman_a',
      'swordsman_c',
      'swordsman_c2',
    ]);
    expect(stands.every((stand) => stand.side === 0)).toBe(true);
    const positions = stands.map((stand) => stand.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    // Najdalej w prawo stoi slot 0, jak w walce.
    expect(stands.map((stand) => stand.slot)).toEqual([2, 1, 0]);
  });

  it('bez wybranej formy idzie od formy bazowej pierwszą drogą z treści', () => {
    expect(formStands(content, 'swordsman', null).map((stand) => stand.unitId)).toEqual([
      'swordsman_a',
      'swordsman_b',
      'swordsman_b2',
    ]);
  });

  it('dla nieznanej linii nie stawia nikogo', () => {
    expect(formStands(content, 'nobody', null)).toEqual([]);
  });

  it('formy drogi dają poprawne wejście symulacji', () => {
    const stands = formStands(content, 'archer', 'archer_b2');
    const scene = standScene(content, stands);
    expect(validateSetup(scene.setup)).toEqual([]);
    const battle = createBattle(scene.setup);
    for (const stand of stands) {
      expect(battle.state.x[stand.slot]).toBe(arenaXAt(stand.position, content.arena.width));
      expect(scene.setup.player[stand.slot]).toBe(content.heroes.get(stand.unitId)?.base);
    }
  });
});

describe('squadFieldSetup', () => {
  it('przenosi sloty gracza w miejsca pól, zachowując skład i kolejność od frontu', () => {
    const save = newSave(content, '0.0.0', 'pl');
    const level = content.levels.get('w1_l1');
    if (level === undefined) throw new Error('no level');
    const setup = levelSetup(content, level, squadMembers(content, save));
    const fields = squadFieldSetup(setup);
    expect(validateSetup(fields)).toEqual([]);
    expect(fields.player).toBe(setup.player);
    expect(fields.enemy.every((unit) => unit === null)).toBe(true);
    expect(() => createBattle(fields)).not.toThrow();
    expect(fields.arena.playerSlots).toEqual(
      SQUAD_FIELD_AT.map((at) => arenaXAt(at, setup.arena.width)),
    );
    // Front stoi najdalej w prawo, jak w walce.
    const slots = fields.arena.playerSlots;
    expect([...slots].sort((a, b) => b - a)).toEqual(slots);
  });
});

describe('standScene', () => {
  it('daje poprawne wejście symulacji z bohaterami na ich stanowiskach', () => {
    const stands = shopStands(content);
    const scene = standScene(content, stands);
    expect(validateSetup(scene.setup)).toEqual([]);
    const battle = createBattle(scene.setup);
    for (const stand of stands) {
      const x = arenaXAt(stand.position, content.arena.width);
      const { arena, player, enemy } = scene.setup;
      // Prawa strona sceny to sloty przeciwnika: jednostki 5..9.
      const unitId = stand.side === 0 ? stand.slot : SQUAD_SLOTS + stand.slot;
      expect((stand.side === 0 ? arena.playerSlots : arena.enemySlots)[stand.slot]).toBe(x);
      expect((stand.side === 0 ? player : enemy)[stand.slot]).toBe(
        content.heroes.get(stand.unitId)?.base,
      );
      expect(scene.visuals[unitId]).toBe(content.heroes.get(stand.unitId)?.visual);
      expect(battle.state.x[unitId]).toBe(x);
    }
    expect(scene.visuals.filter((visual) => visual !== null)).toHaveLength(stands.length);
  });

  it('prawa strona sceny trafia do slotów przeciwnika', () => {
    const many = withLines(7);
    const stands = shopStands(many);
    const scene = standScene(many, stands);
    expect(validateSetup(scene.setup)).toEqual([]);
    expect(scene.setup.player.filter((unit) => unit !== null)).toHaveLength(4);
    expect(scene.setup.enemy.filter((unit) => unit !== null)).toHaveLength(3);
    expect(scene.visuals.filter((visual) => visual !== null)).toHaveLength(7);
    const right = stands.filter((stand) => stand.side === 1);
    for (const stand of right) {
      expect(scene.setup.arena.enemySlots[stand.slot]).toBe(
        arenaXAt(stand.position, many.arena.width),
      );
    }
  });
});
