// Rysowanie pocisków i liczb obrażeń oraz leczenia. Gorąca ścieżka: bez alokacji.
import { nextRange } from '../core/rng.ts';
import { type Battle, MAX_PROJECTILES } from '../sim/index.ts';
import { type Sprite, VARIANT_NORMAL } from './atlas.ts';
import {
  digitAt,
  digitCount,
  FLOAT_KIND_HEAL,
  FLOAT_LIFE_MS,
  FLOAT_RISE,
  spawnFloatText,
} from './float-text.ts';
import { blit, laneFeetY, type Scene, unitHeadY, unitSceneX, unitSlot } from './scene.ts';
import type { Viewport } from './viewport.ts';

/** Wysokość lotu pocisku nad stopami strzelca w jednostkach rigu. */
const PROJECTILE_HEIGHT = 43;
/** Skala cyfr liczb nad jednostkami i odstęp między nimi, w jednostkach logicznych sceny. */
const NUMBER_SCALE = 2;
const NUMBER_ADVANCE = 11;

export function drawProjectiles(
  scene: Scene,
  battle: Battle,
  viewport: Viewport,
  alpha: number,
): void {
  const { state } = battle;
  const image = scene.atlas.images[VARIANT_NORMAL];
  if (image === undefined) return;
  const s = viewport.scale;
  for (let p = 0; p < state.projCount && p < MAX_PROJECTILES; p++) {
    const owner = state.projOwner[p] ?? 0;
    const sprite = scene.projectileSprites[owner];
    const look = scene.looks[owner];
    if (sprite === null || sprite === undefined || look === null || look === undefined) continue;
    const prev = state.projPrevX[p] ?? 0;
    const x = (prev + ((state.projX[p] ?? 0) - prev) * alpha) * scene.camera.scale;
    const y = laneFeetY(unitSlot(owner)) - PROJECTILE_HEIGHT * look.scale;
    const direction = (state.projStep[p] ?? 1) > 0 ? 1 : -1;
    scene.ctx.setTransform(direction * look.scale * s, 0, 0, look.scale * s, x * s, y * s);
    blit(scene, image, sprite, -sprite.pivotX, -sprite.pivotY);
  }
}

/** Dodaje liczbę nad głową jednostki; pozycja ze stanu po ostatnim ticku. */
export function spawnNumber(
  scene: Scene,
  battle: Battle,
  unit: number,
  value: number,
  kind: number,
): void {
  const look = scene.looks[unit];
  if (look === null || look === undefined) return;
  const x = unitSceneX(scene, unit, battle.state.x[unit] ?? 0);
  const y = unitHeadY(look, unitSlot(unit)) - 20;
  spawnFloatText(scene.floatTexts, x + nextRange(scene.jitter, -10, 10), y, value, kind);
}

function drawGlyph(
  scene: Scene,
  image: CanvasImageSource,
  sprite: Sprite | null | undefined,
  s: number,
  x: number,
  y: number,
): void {
  if (sprite === null || sprite === undefined) return;
  const scale = NUMBER_SCALE * s;
  scene.ctx.setTransform(scale, 0, 0, scale, x * s, y * s);
  blit(scene, image, sprite, -sprite.pivotX, -sprite.pivotY);
}

export function drawNumbers(scene: Scene, viewport: Viewport): void {
  const { ctx, floatTexts } = scene;
  const image = scene.atlas.images[VARIANT_NORMAL];
  if (image === undefined) return;
  for (let i = 0; i < floatTexts.count; i++) {
    const text = floatTexts.items[i];
    if (text === undefined) continue;
    const progress = text.ageMs / FLOAT_LIFE_MS;
    // Szybki start, łagodne wyhamowanie; zanikanie dopiero pod koniec.
    const y = text.y - FLOAT_RISE * (1 - (1 - progress) * (1 - progress));
    ctx.globalAlpha = progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4;

    const heal = text.kind === FLOAT_KIND_HEAL;
    const digits = digitCount(text.value);
    const glyphs = heal ? digits + 1 : digits;
    let x = text.x - ((glyphs - 1) * NUMBER_ADVANCE) / 2;
    if (heal) {
      drawGlyph(scene, image, scene.plusSprite, viewport.scale, x, y);
      x += NUMBER_ADVANCE;
    }
    for (let d = 0; d < digits; d++) {
      const sprite = scene.digitSprites[(heal ? 10 : 0) + digitAt(text.value, digits, d)];
      drawGlyph(scene, image, sprite, viewport.scale, x, y);
      x += NUMBER_ADVANCE;
    }
  }
  ctx.globalAlpha = 1;
}
