// Renderer walki na Canvas 2D (ADR 0001). Gorąca ścieżka (`draw`) nie alokuje: żadnych
// obiektów, tablic, domknięć ani napisów tworzonych co klatkę. Wszystkie bufory powstają raz,
// w `createScene`; rysowanie jest w draw-units.ts, draw-rig.ts i draw-effects.ts.
import type { UnitVisual } from '../content/compile.ts';
import {
  type Battle,
  EVENT_DAMAGED,
  EVENT_DODGED,
  EVENT_HEALED,
  EVENT_SUMMONED,
  type EventBuffer,
  MAX_UNITS,
  SQUAD_UNITS,
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
  FLOAT_KIND_DODGE,
  FLOAT_KIND_HEAL,
  updateFloatTexts,
} from './float-text.ts';
import { compileRigs, type RenderAssets, resolveLook, skinParts } from './looks.ts';
import { measureReach } from './reach.ts';
import type { Renderer } from './renderer.ts';
import { copyLook, createScene, headHeightOf, LOOK_ROWS } from './scene.ts';
import type { Viewport } from './viewport.ts';

export function createCanvasRenderer(
  ctx: CanvasRenderingContext2D,
  assets: RenderAssets,
): Renderer {
  const { atlas } = assets;
  const rigs = compileRigs(assets.rigs);
  const { maxBones } = rigs;
  const scene = createScene(ctx, atlas, maxBones, rigs.maxChannels);

  /** Wypełnia wiersz wyglądu `row`: wygląd, części, zasięg postaci, pocisk. */
  function prepareLook(row: number, visual: UnitVisual): void {
    const look = resolveLook(rigs, visual);
    scene.looks[row] = look;
    const parts = skinParts(atlas, look.rig, visual.skin);
    parts.forEach((sprite, bone) => {
      scene.boneSprites[row * maxBones + bone] = sprite;
    });
    const reach = measureReach(look, parts);
    scene.reachBack[row] = reach.back;
    scene.reachFront[row] = reach.front;
    scene.reachHeight[row] = reach.height;
    scene.headHeight[row] = headHeightOf(look, reach.stand);
    scene.projectileSprites[row] =
      visual.projectileSprite === null
        ? null
        : (atlas.sprites.get(`fx/${visual.projectileSprite}`) ?? null);
    scene.projectileHeights[row] = visual.projectileHeight * look.scale;
  }

  return {
    beginBattle(battle: Battle, visuals: readonly (UnitVisual | null)[]): void {
      scene.battle = battle;
      scene.topUnit = -1;
      scene.showcase = false;
      fitCamera(scene.camera, battle.width);
      resetAnimator(scene.animator);
      clearFloatTexts(scene.floatTexts);
      scene.boneSprites.fill(null);
      for (let row = 0; row < LOOK_ROWS; row++) {
        scene.looks[row] = null;
        scene.projectileSprites[row] = null;
      }
      for (let unit = 0; unit < SQUAD_UNITS; unit++) {
        const visual = visuals[unit] ?? null;
        if (visual === null) continue;
        prepareLook(unit, visual);
        // Wzorzec tego, co jednostka przyzywa: miejsca przyzwanych dostają go w `consume`.
        if (visual.summon !== null) prepareLook(MAX_UNITS + unit, visual.summon);
      }
    },

    consume(events: EventBuffer): void {
      const { battle } = scene;
      animatorOnEvents(scene.animator, events);
      if (battle === null) return;
      for (let i = 0; i < events.count; i++) {
        const type = events.type[i];
        if (type === EVENT_SUMMONED) {
          // Animator wyzerował już stan miejsca; tu przyzwany dostaje wygląd od przyzywacza.
          copyLook(scene, MAX_UNITS + (events.b[i] ?? 0), events.a[i] ?? 0);
          continue;
        }
        if (type === EVENT_DODGED) {
          spawnNumber(scene, battle, events.a[i] ?? 0, 0, FLOAT_KIND_DODGE);
          continue;
        }
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
      drawBackground(ctx, viewport, scene.backdrop);
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
      // Przyzwani na wierzchu składów: są mali i wychodzą przed swojego przyzywacza.
      if (battle.hasSummons) {
        for (let unit = SQUAD_UNITS; unit < MAX_UNITS; unit++) {
          drawUnit(scene, battle, unit, viewport, alpha, frameMs);
        }
      }
      if (top >= 0) drawUnit(scene, battle, top, viewport, alpha, frameMs);
      drawProjectiles(scene, battle, viewport, alpha);
      drawNumbers(scene, viewport);
      ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
      if (import.meta.env.DEV && debugOptions.perf) debugOverlay(ctx);
    },

    setShowcase(on: boolean): void {
      scene.showcase = on;
    },
    setBackdrop(backdrop): void {
      scene.backdrop = backdrop;
    },
    setTopUnit(unit: number): void {
      scene.topUnit = Number.isInteger(unit) && unit >= 0 && unit < MAX_UNITS ? unit : -1;
    },

    endBattle(): void {
      scene.battle = null;
    },
  };
}
