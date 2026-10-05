// Renderer walki na Canvas 2D (ADR 0001). Gorąca ścieżka (`draw`) nie alokuje: żadnych
// obiektów, tablic, domknięć ani napisów tworzonych co klatkę. Wszystkie bufory powstają raz,
// w `createScene`; rysowanie jest w draw-units.ts, draw-rig.ts i draw-effects.ts.
import type { UnitVisual } from '../content/compile.ts';
import {
  type Battle,
  EVENT_DAMAGED,
  EVENT_HEALED,
  type EventBuffer,
  MAX_UNITS,
  TEAM_SIZE,
} from '../sim/index.ts';
import { animatorOnEvents, resetAnimator } from './animation.ts';
import { drawBackground } from './background.ts';
import { fitCamera } from './camera.ts';
import { debugOptions, debugOverlay, debugStats } from './debug.ts';
import { drawNumbers, drawProjectiles, spawnNumber } from './draw-effects.ts';
import { drawUnit } from './draw-units.ts';
import {
  clearFloatTexts,
  FLOAT_KIND_DAMAGE,
  FLOAT_KIND_HEAL,
  updateFloatTexts,
} from './float-text.ts';
import { compileRigs, type RenderAssets, resolveLook, skinParts } from './looks.ts';
import { measureReach } from './reach.ts';
import type { Renderer } from './renderer.ts';
import { createScene } from './scene.ts';
import type { Viewport } from './viewport.ts';

export function createCanvasRenderer(
  ctx: CanvasRenderingContext2D,
  assets: RenderAssets,
): Renderer {
  const { atlas } = assets;
  const rigs = compileRigs(assets.rigs);
  const { maxBones } = rigs;
  const scene = createScene(ctx, atlas, maxBones, rigs.maxChannels);

  return {
    beginBattle(battle: Battle, visuals: readonly (UnitVisual | null)[]): void {
      scene.battle = battle;
      scene.topUnit = -1;
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
        const look = resolveLook(rigs, visual);
        scene.looks[unit] = look;
        const parts = skinParts(atlas, look.rig, visual.skin);
        parts.forEach((sprite, bone) => {
          scene.boneSprites[unit * maxBones + bone] = sprite;
        });
        const reach = measureReach(look, parts);
        scene.reachBack[unit] = reach.back;
        scene.reachFront[unit] = reach.front;
        scene.reachHeight[unit] = reach.height;
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
      const top = scene.topUnit;
      for (let slot = TEAM_SIZE - 1; slot >= 0; slot--) {
        if (slot !== top) drawUnit(scene, battle, slot, viewport, alpha, frameMs);
        if (TEAM_SIZE + slot !== top) {
          drawUnit(scene, battle, TEAM_SIZE + slot, viewport, alpha, frameMs);
        }
      }
      if (top >= 0) drawUnit(scene, battle, top, viewport, alpha, frameMs);
      drawProjectiles(scene, battle, viewport, alpha);
      drawNumbers(scene, viewport);
      ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
      if (import.meta.env.DEV && debugOptions.perf) debugOverlay(ctx);
    },

    setTopUnit(unit: number): void {
      scene.topUnit = Number.isInteger(unit) && unit >= 0 && unit < MAX_UNITS ? unit : -1;
    },

    endBattle(): void {
      scene.battle = null;
    },
  };
}
