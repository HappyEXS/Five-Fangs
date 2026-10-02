// Renderer walki na Canvas 2D (ADR 0001). Gorąca ścieżka (`draw`) nie alokuje: żadnych
// obiektów, tablic, domknięć ani napisów tworzonych co klatkę. Wszystkie bufory powstają raz,
// w `createCanvasRenderer`; rysowanie jest w draw-units.ts i draw-effects.ts.
import type { UnitVisual } from '../content/compile.ts';
import type { RawRig } from '../content/schema-rig.ts';
import { createRng } from '../core/rng.ts';
import {
  type Battle,
  EVENT_DAMAGED,
  EVENT_HEALED,
  type EventBuffer,
  MAX_UNITS,
  TEAM_SIZE,
} from '../sim/index.ts';
import { animatorOnEvents, createAnimator, resetAnimator, type UnitLook } from './animation.ts';
import type { Atlas, Sprite } from './atlas.ts';
import { drawBackground } from './background.ts';
import { createCamera, fitCamera } from './camera.ts';
import { debugOptions, debugOverlay, debugStats } from './debug.ts';
import { drawNumbers, drawProjectiles, spawnNumber } from './draw-effects.ts';
import { drawUnit } from './draw-units.ts';
import {
  clearFloatTexts,
  createFloatTexts,
  FLOAT_KIND_DAMAGE,
  FLOAT_KIND_HEAL,
  updateFloatTexts,
} from './float-text.ts';
import type { Renderer } from './renderer.ts';
import { type CompiledRig, compileRig, MATRIX_SIZE } from './rig.ts';
import type { Scene } from './scene.ts';
import type { Viewport } from './viewport.ts';

export interface RenderAssets {
  readonly atlas: Atlas;
  readonly rigs: ReadonlyMap<string, RawRig>;
}

export function createCanvasRenderer(
  ctx: CanvasRenderingContext2D,
  assets: RenderAssets,
): Renderer {
  const { atlas } = assets;
  const rigs = new Map<string, CompiledRig>();
  let maxBones = 1;
  let maxChannels = 1;
  for (const [id, raw] of assets.rigs) {
    const rig = compileRig(raw);
    rigs.set(id, rig);
    maxBones = Math.max(maxBones, rig.boneCount);
    maxChannels = Math.max(maxChannels, rig.channelCount);
  }

  const digitSprites: (Sprite | null)[] = [];
  for (const set of ['dmg', 'heal']) {
    for (let digit = 0; digit <= 9; digit++) {
      digitSprites.push(atlas.sprites.get(`fx/${set}_${digit}`) ?? null);
    }
  }

  const scene: Scene = {
    ctx,
    atlas,
    camera: createCamera(),
    animator: createAnimator(maxChannels),
    root: new Float32Array(MATRIX_SIZE),
    matrices: new Float32Array(maxBones * MATRIX_SIZE),
    maxBones,
    looks: new Array<UnitLook | null>(MAX_UNITS).fill(null),
    boneSprites: new Array<Sprite | null>(MAX_UNITS * maxBones).fill(null),
    projectileSprites: new Array<Sprite | null>(MAX_UNITS).fill(null),
    floatTexts: createFloatTexts(),
    jitter: createRng(1),
    digitSprites,
    plusSprite: atlas.sprites.get('fx/heal_plus') ?? null,
    battle: null,
  };

  function resolveLook(visual: UnitVisual): UnitLook {
    const rig = rigs.get(visual.rig);
    if (rig === undefined) throw new Error(`Unknown rig "${visual.rig}"`);
    const rest = rig.stances.get(visual.stance);
    const idle = rig.clips.get('idle');
    const walk = rig.clips.get('walk');
    const attack = rig.clips.get(visual.attackClip);
    if (rest === undefined || idle === undefined || walk === undefined || attack === undefined) {
      throw new Error(`Rig "${visual.rig}" is missing clips or stance for skin "${visual.skin}"`);
    }
    return {
      rig,
      rest,
      idle,
      walk,
      attack,
      scale: rig.scale * visual.scale,
      string: rig.strings.get(visual.stance) ?? null,
    };
  }

  return {
    beginBattle(battle: Battle, visuals: readonly (UnitVisual | null)[]): void {
      scene.battle = battle;
      fitCamera(scene.camera, battle.width);
      resetAnimator(scene.animator);
      clearFloatTexts(scene.floatTexts);
      scene.boneSprites.fill(null);
      for (let unit = 0; unit < MAX_UNITS; unit++) {
        const visual = visuals[unit] ?? null;
        if (visual === null) {
          scene.looks[unit] = null;
          scene.projectileSprites[unit] = null;
          continue;
        }
        const look = resolveLook(visual);
        scene.looks[unit] = look;
        look.rig.sprites.forEach((part, bone) => {
          scene.boneSprites[unit * maxBones + bone] =
            atlas.sprites.get(`${visual.skin}/${part}`) ?? null;
        });
        scene.projectileSprites[unit] =
          visual.projectileSprite === null
            ? null
            : (atlas.sprites.get(`fx/${visual.projectileSprite}`) ?? null);
      }
    },

    consume(events: EventBuffer): void {
      const { battle } = scene;
      animatorOnEvents(scene.animator, events);
      if (battle === null) return;
      for (let i = 0; i < events.count; i++) {
        const type = events.type[i];
        const value = events.b[i] ?? 0;
        if (value <= 0) continue;
        if (type === EVENT_DAMAGED) {
          spawnNumber(scene, battle, events.a[i] ?? 0, value, FLOAT_KIND_DAMAGE);
        } else if (type === EVENT_HEALED) {
          spawnNumber(scene, battle, events.a[i] ?? 0, value, FLOAT_KIND_HEAL);
        }
      }
    },

    draw(viewport: Viewport, alpha: number, frameMs: number): void {
      if (import.meta.env.DEV) debugStats.drawCalls = 0;
      drawBackground(ctx, viewport);
      const { battle } = scene;
      if (battle === null) return;
      updateFloatTexts(scene.floatTexts, frameMs);
      // Od najdalszego slotu do najbliższego, żeby bliższe postacie zasłaniały dalsze.
      for (let slot = TEAM_SIZE - 1; slot >= 0; slot--) {
        drawUnit(scene, battle, slot, viewport, alpha, frameMs);
        drawUnit(scene, battle, TEAM_SIZE + slot, viewport, alpha, frameMs);
      }
      drawProjectiles(scene, battle, viewport, alpha);
      drawNumbers(scene, viewport);
      ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
      if (import.meta.env.DEV && debugOptions.perf) debugOverlay(ctx);
    },

    endBattle(): void {
      scene.battle = null;
    },
  };
}
