import { describe, expect, it } from 'vitest';
import unitsMeta from '../assets/generated/units.json' with { type: 'json' };
import type { UnitVisual } from '../content/compile.ts';
import { requireContent } from '../content/load.ts';
import type { RawRig } from '../content/schema-rig.ts';
import type { UnitLook } from './animation.ts';
import { parseAtlasMeta } from './atlas.ts';
import { compileRigs, resolveLook } from './looks.ts';
import { portraitFrame, posePortrait } from './portrait.ts';
import { type CompiledPortrait, compileRig, MATRIX_SIZE } from './rig.ts';

function posed(look: UnitLook, portrait: CompiledPortrait = look.rig.portrait): Float32Array {
  const { rig } = look;
  const matrices = new Float32Array(rig.boneCount * MATRIX_SIZE);
  posePortrait(
    look,
    portrait,
    new Float32Array(rig.channelCount),
    new Float32Array(MATRIX_SIZE),
    matrices,
  );
  return matrices;
}

/** Punkt (x, y) kości po przekształceniu jej macierzą. */
function pointOf(matrices: Float32Array, bone: number, x: number, y: number): [number, number] {
  const m = bone * MATRIX_SIZE;
  return [
    (matrices[m] ?? 0) * x + (matrices[m + 2] ?? 0) * y + (matrices[m + 4] ?? 0),
    (matrices[m + 1] ?? 0) * x + (matrices[m + 3] ?? 0) * y + (matrices[m + 5] ?? 0),
  ];
}

function stickLook(bodyAngle: number): UnitLook {
  const raw: RawRig = {
    id: 'stick',
    hipHeight: 10,
    scale: 2,
    strideLength: 20,
    bones: [
      { id: 'body', parent: 'root', at: [0, 0], sprite: 'torso', back: false, optional: false },
      { id: 'head', parent: 'body', at: [0, -10], sprite: 'head', back: false, optional: false },
    ],
    drawOrder: ['body', 'head'],
    portrait: { bone: 'head', center: [1, -3], size: 10 },
    stances: { plain: {} },
    strings: {},
    clips: {
      idle: {
        loop: true,
        markers: {},
        channels: {
          body: [
            [0, bodyAngle],
            [0.5, bodyAngle + 20],
            [1, bodyAngle],
          ],
          bob: [[0, -2]],
        },
      },
      walk: { loop: true, markers: {}, channels: { body: [[0, 0]] } },
    },
  };
  const rig = compileRig(raw);
  const rest = rig.stances.get('plain');
  const idle = rig.clips.get('idle');
  const walk = rig.clips.get('walk');
  if (rest === undefined || idle === undefined || walk === undefined) throw new Error('bad rig');
  return { rig, rest, idle, walk, attack: walk, scale: rig.scale, string: null };
}

describe('posePortrait', () => {
  it('przesuwa postać tak, że lewy górny róg kadru leży w (0, 0)', () => {
    const matrices = posed(stickLook(0));
    // Biodra w (0, -2) po `bob`, szyja 10 wyżej, środek kadru w (1, -15): róg kadru w (-4, -20).
    expect(pointOf(matrices, 0, 0, 0)).toEqual([4, 18]);
    expect(pointOf(matrices, 1, 0, 0)).toEqual([4, 8]);
    expect(pointOf(matrices, 1, 1, -3)).toEqual([5, 5]);
  });

  it('kadr idzie za kością także w pochylonej pozie, w jednostkach rigu niezależnie od skali', () => {
    const look = stickLook(90);
    const matrices = posed(look);
    const [x, y] = pointOf(matrices, 1, 1, -3);
    expect(x).toBeCloseTo(5);
    expect(y).toBeCloseTo(5);
    // Tułów obrócony o 90°: szyja leży na prawo od bioder, nie nad nimi.
    const [hipX, hipY] = pointOf(matrices, 0, 0, 0);
    const [neckX, neckY] = pointOf(matrices, 1, 0, 0);
    expect(neckX - hipX).toBeCloseTo(10);
    expect(neckY - hipY).toBeCloseTo(0);
  });
});

describe('portraitFrame', () => {
  const look = stickLook(0);
  const visual: UnitVisual = {
    rig: 'stick',
    skin: 'any',
    scale: 1,
    attackClip: 'walk',
    stance: 'plain',
    projectileSprite: null,
    projectileHeight: 0,
    portrait: null,
    summon: null,
  };

  it('bez własnego kadru jednostki bierze kadr rigu', () => {
    expect(portraitFrame(look.rig, visual)).toBe(look.rig.portrait);
  });

  it('własny kadr jednostki liczy się od tej samej kości i przesuwa postać inaczej', () => {
    const own = portraitFrame(look.rig, { ...visual, portrait: { x: 3, y: -8, size: 20 } });
    expect(own).toEqual({ bone: 1, x: 3, y: -8, size: 20 });
    // Środek własnego kadru trafia w środek kwadratu o boku 20.
    expect(pointOf(posed(look, own), 1, 3, -8)).toEqual([10, 10]);
  });
});

describe('kadr miniaturki w treści gry', () => {
  const content = requireContent();
  const sprites = parseAtlasMeta(unitsMeta);
  const rigs = compileRigs(content.rigs);
  const units = [...content.heroes.values(), ...content.enemies.values()];

  it('leży na głowie każdej jednostki i obejmuje co najmniej połowę jej sprite’a', () => {
    expect(units.length).toBeGreaterThan(0);
    for (const unit of units) {
      const look = resolveLook(rigs, unit.visual);
      const portrait = portraitFrame(look.rig, unit.visual);
      const part = look.rig.sprites[portrait.bone];
      const sprite = sprites.get(`${unit.visual.skin}/${part}`);
      if (sprite === undefined) throw new Error(`${unit.id}: no sprite for the portrait bone`);
      const matrices = posed(look, portrait);
      // Prostokąt ograniczający głowę w układzie kadru (0..size).
      let left = Number.POSITIVE_INFINITY;
      let top = Number.POSITIVE_INFINITY;
      let right = Number.NEGATIVE_INFINITY;
      let bottom = Number.NEGATIVE_INFINITY;
      for (let corner = 0; corner < 4; corner++) {
        const [x, y] = pointOf(
          matrices,
          portrait.bone,
          sprite.offsetX + (corner & 1 ? sprite.width : 0),
          sprite.offsetY + (corner & 2 ? sprite.height : 0),
        );
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      const { size } = portrait;
      const center = size / 2;
      expect(left, unit.id).toBeLessThan(center);
      expect(right, unit.id).toBeGreaterThan(center);
      expect(top, unit.id).toBeLessThan(center);
      expect(bottom, unit.id).toBeGreaterThan(center);
      const seen =
        Math.max(0, Math.min(right, size) - Math.max(left, 0)) *
        Math.max(0, Math.min(bottom, size) - Math.max(top, 0));
      expect(seen / ((right - left) * (bottom - top)), unit.id).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('ludzie mieszczą w kadrze całą głowę', () => {
    const swordsman = content.heroes.get('swordsman_a');
    if (swordsman === undefined) throw new Error('no swordsman');
    const look = resolveLook(rigs, swordsman.visual);
    const { portrait } = look.rig;
    const sprite = sprites.get('swordsman_a/head');
    if (sprite === undefined) throw new Error('no head sprite');
    const matrices = posed(look);
    for (let corner = 0; corner < 4; corner++) {
      const point = pointOf(
        matrices,
        portrait.bone,
        sprite.offsetX + (corner & 1 ? sprite.width : 0),
        sprite.offsetY + (corner & 2 ? sprite.height : 0),
      );
      for (const value of point) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(portrait.size);
      }
    }
  });
});
