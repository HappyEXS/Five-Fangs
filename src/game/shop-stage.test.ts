import { describe, expect, it } from 'vitest';
import { type GameContent, requireContent } from '../content/load.ts';
import type { CompiledLine } from '../content/load-progression.ts';
import { createBattle, validateSetup } from '../sim/index.ts';
import { SQUAD_SLOTS } from './save-schema.ts';
import { shopScene, shopStands } from './shop-stage.ts';

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
  it('stawia każdą linię z treści gry w jednym rzędzie, w kolejności z treści', () => {
    const stands = shopStands(content);
    expect(stands.map((stand) => stand.line)).toEqual([...content.lines.keys()]);
    expect(stands.every((stand) => stand.side === 0)).toBe(true);
    expect(stands.map((stand) => stand.slot)).toEqual(stands.map((_, index) => index));
    expect(stands[0]?.position).toBeCloseTo(0.12);
    expect(stands.at(-1)?.position).toBeCloseTo(0.88);
    for (const stand of stands) {
      expect(stand.unitId).toBe(content.lines.get(stand.line)?.forms[0]);
    }
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

describe('shopScene', () => {
  it('daje poprawne wejście symulacji z bohaterami na ich stanowiskach', () => {
    const stands = shopStands(content);
    const scene = shopScene(content, stands);
    expect(validateSetup(scene.setup)).toEqual([]);
    const battle = createBattle(scene.setup);
    for (const stand of stands) {
      const x = Math.round(stand.position * content.arena.width);
      expect(scene.setup.arena.playerSlots[stand.slot]).toBe(x);
      expect(scene.setup.player[stand.slot]).toBe(content.heroes.get(stand.unitId)?.base);
      expect(scene.visuals[stand.slot]).toBe(content.heroes.get(stand.unitId)?.visual);
      expect(battle.state.x[stand.slot]).toBe(x);
    }
    expect(scene.setup.enemy.every((unit) => unit === null)).toBe(true);
  });

  it('prawa strona sceny trafia do slotów przeciwnika', () => {
    const many = withLines(7);
    const stands = shopStands(many);
    const scene = shopScene(many, stands);
    expect(validateSetup(scene.setup)).toEqual([]);
    expect(scene.setup.player.filter((unit) => unit !== null)).toHaveLength(4);
    expect(scene.setup.enemy.filter((unit) => unit !== null)).toHaveLength(3);
    expect(scene.visuals.filter((visual) => visual !== null)).toHaveLength(7);
    const right = stands.filter((stand) => stand.side === 1);
    for (const stand of right) {
      expect(scene.setup.arena.enemySlots[stand.slot]).toBe(
        Math.round(stand.position * many.arena.width),
      );
    }
  });
});
