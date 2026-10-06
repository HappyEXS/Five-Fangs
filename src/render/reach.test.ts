import { describe, expect, it } from 'vitest';
import unitsMeta from '../assets/generated/units.json' with { type: 'json' };
import type { UnitVisual } from '../content/compile.ts';
import { requireContent } from '../content/load.ts';
import type { UnitLook } from './animation.ts';
import { parseAtlasMeta } from './atlas.ts';
import { ARENA_MARGIN, arenaToStageX } from './camera.ts';
import { HP_HALF_WIDTH, keepOnStage, measureReach } from './reach.ts';
import { compileRig } from './rig.ts';
import { headHeightOf, UPPER_BODY } from './scene.ts';
import { LOGICAL_WIDTH } from './viewport.ts';

const content = requireContent();
const sprites = parseAtlasMeta(unitsMeta);

/** Wygląd jednostki tak, jak rozwiązuje go renderer (canvas-renderer.ts). */
function lookOf(visual: UnitVisual): { look: UnitLook; parts: ReturnType<typeof sprites.get>[] } {
  const raw = content.rigs.get(visual.rig);
  if (raw === undefined) throw new Error(`no rig ${visual.rig}`);
  const rig = compileRig(raw);
  const rest = rig.stances.get(visual.stance);
  const idle = rig.clips.get('idle');
  const walk = rig.clips.get('walk');
  const attack = rig.clips.get(visual.attackClip);
  if (rest === undefined || idle === undefined || walk === undefined || attack === undefined) {
    throw new Error(`incomplete look for ${visual.skin}`);
  }
  const look = { rig, rest, idle, walk, attack, scale: rig.scale * visual.scale, string: null };
  return { look, parts: rig.sprites.map((part) => sprites.get(`${visual.skin}/${part}`)) };
}

const allUnits = [...content.heroes.values(), ...content.enemies.values()];

describe('measureReach', () => {
  it('mierzy postać z prawdziwego rigu i atlasu: miecz sięga dalej przed niż za plecy', () => {
    const swordsman = content.heroes.get('swordsman_a');
    if (swordsman === undefined) throw new Error('no swordsman');
    const { look, parts } = lookOf(swordsman.visual);
    const reach = measureReach(
      look,
      parts.map((part) => part ?? null),
    );
    expect(reach.front).toBeGreaterThan(reach.back);
    expect(reach.back).toBeGreaterThanOrEqual(HP_HALF_WIDTH);
    // Postać ma kilkadziesiąt jednostek wysokości, a nie kilka ani kilkaset.
    expect(reach.height).toBeGreaterThan(60);
    expect(reach.height).toBeLessThan(250);
  });

  it('mierzy czubek stojącej postaci: nie wyżej niż najwyższy punkt wszystkich klipów', () => {
    for (const unit of allUnits) {
      const { look, parts } = lookOf(unit.visual);
      const reach = measureReach(
        look,
        parts.map((part) => part ?? null),
      );
      expect(reach.stand, unit.id).toBeGreaterThan(0);
      expect(reach.stand, unit.id).toBeLessThanOrEqual(reach.height);
    }
  });
});

describe('headHeightOf', () => {
  const reachOf = (id: string) => {
    const unit = content.heroes.get(id);
    if (unit === undefined) throw new Error(`no unit ${id}`);
    const { look, parts } = lookOf(unit.visual);
    return {
      look,
      stand: measureReach(
        look,
        parts.map((part) => part ?? null),
      ).stand,
    };
  };

  it('ludzie mają pasek życia na wspólnej wysokości z rigu', () => {
    const { look, stand } = reachOf('swordsman_a');
    const human = (look.rig.hipHeight + UPPER_BODY) * look.scale;
    expect(stand).toBeLessThan(human);
    expect(headHeightOf(look, stand)).toBe(human);
  });

  it('wysoka bestia ma pasek nad własnym łbem', () => {
    const { look, stand } = reachOf('ironbeak');
    const human = (look.rig.hipHeight + UPPER_BODY) * look.scale;
    expect(stand).toBeGreaterThan(human);
    expect(headHeightOf(look, stand)).toBe(stand);
  });
});

describe('keepOnStage', () => {
  const back = 30;
  const front = 55;
  const height = 120;

  it('nie rusza postaci z dala od krawędzi', () => {
    expect(keepOnStage(640, 1, back, front, height, 0)).toBe(640);
    expect(keepOnStage(640, -1, back, front, height, 0.5)).toBe(640);
  });

  it('przy lewej krawędzi odsuwa postać o jej zasięg w tę stronę', () => {
    expect(keepOnStage(0, 1, back, front, height, 0)).toBe(back);
    expect(keepOnStage(0, -1, back, front, height, 0)).toBe(front);
  });

  it('przy prawej krawędzi tak samo', () => {
    expect(keepOnStage(LOGICAL_WIDTH, 1, back, front, height, 0)).toBe(LOGICAL_WIDTH - front);
    expect(keepOnStage(LOGICAL_WIDTH, -1, back, front, height, 0)).toBe(LOGICAL_WIDTH - back);
  });

  it('postać padająca do tyłu sięga za plecami na swoją wysokość', () => {
    expect(keepOnStage(0, 1, back, front, height, 1)).toBeCloseTo(height);
    expect(keepOnStage(LOGICAL_WIDTH, -1, back, front, height, 1)).toBeCloseTo(
      LOGICAL_WIDTH - height,
    );
    // W połowie padania zasięg rośnie, ale nie przekracza sumy obu wymiarów.
    const half = keepOnStage(0, 1, back, front, height, 0.5);
    expect(half).toBeGreaterThan(back);
    expect(half).toBeLessThan(back + height);
  });

  it('każda postać z treści na krawędzi pola mieści się na scenie, także padając', () => {
    // Odrzut spycha postać w stronę jej pleców: gracza w lewo, przeciwnika w prawo. Sprawdzamy
    // też odwrotne ustawienie, które zdarza się rzadko, ale nie może wystawać.
    const width = content.arena.width;
    const left = arenaToStageX(0, width);
    const right = arenaToStageX(width, width);
    for (const unit of allUnits) {
      const { look, parts } = lookOf(unit.visual);
      const { back, front, height } = measureReach(
        look,
        parts.map((part) => part ?? null),
      );
      for (const fall of [0, 0.25, 0.5, 0.75, 1]) {
        const tilt = (fall * Math.PI) / 2;
        const behind = back * Math.cos(tilt) + height * Math.sin(tilt);
        const ahead = front * Math.cos(tilt);
        const name = `${unit.visual.skin}, padanie ${fall}`;
        // Patrzy w prawo: plecy po lewej.
        expect(
          keepOnStage(left, 1, back, front, height, fall) - behind,
          name,
        ).toBeGreaterThanOrEqual(-1e-9);
        expect(keepOnStage(right, 1, back, front, height, fall) + ahead, name).toBeLessThanOrEqual(
          LOGICAL_WIDTH + 1e-9,
        );
        // Patrzy w lewo: plecy po prawej.
        expect(
          keepOnStage(right, -1, back, front, height, fall) + behind,
          name,
        ).toBeLessThanOrEqual(LOGICAL_WIDTH + 1e-9);
        expect(
          keepOnStage(left, -1, back, front, height, fall) - ahead,
          name,
        ).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it('łucznik stoi na krawędzi pola bez przesuwania: margines pokrywa jego zasięg', () => {
    const archer = content.heroes.get('archer_a');
    if (archer === undefined) throw new Error('no archer');
    const { look, parts } = lookOf(archer.visual);
    const reach = measureReach(
      look,
      parts.map((part) => part ?? null),
    );
    expect(reach.back).toBeLessThanOrEqual(ARENA_MARGIN);
    const left = arenaToStageX(0, content.arena.width);
    expect(keepOnStage(left, 1, reach.back, reach.front, reach.height, 0)).toBe(left);
  });
});
