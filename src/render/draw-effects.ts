// Rysowanie pocisków i liczb obrażeń oraz leczenia. Gorąca ścieżka: bez alokacji.
import { nextRange } from '../core/rng.ts';
import { type Battle, MAX_PROJECTILES } from '../sim/index.ts';
import { VARIANT_NORMAL } from './atlas.ts';
import {
  digitAt,
  digitCount,
  FLOAT_KIND_HEAL,
  FLOAT_LIFE_MS,
  FLOAT_RISE,
  spawnFloatText,
} from './float-text.ts';
import { blit, FEET_Y, type Scene, unitHeadY } from './scene.ts';
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
  const { local } = scene;
  local[1] = 0;
  local[2] = 0;
  for (let p = 0; p < state.projCount && p < MAX_PROJECTILES; p++) {
    const owner = state.projOwner[p] ?? 0;
    const sprite = scene.projectileSprites[owner];
    const look = scene.looks[owner];
    if (sprite === null || sprite === undefined || look === null || look === undefined) continue;
    const prev = state.projPrevX[p] ?? 0;
    const direction = (state.projStep[p] ?? 1) > 0 ? 1 : -1;
    local[0] = direction * look.scale;
    local[3] = look.scale;
    local[4] = (prev + ((state.projX[p] ?? 0) - prev) * alpha) * scene.camera.scale;
    local[5] = FEET_Y - PROJECTILE_HEIGHT * look.scale;
    blit(scene, image, sprite, local, 0, viewport);
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
  const x = (battle.state.x[unit] ?? 0) * scene.camera.scale;
  // Start nad liczbą życia, która stoi tuż nad paskiem (draw-units.ts).
  const y = unitHeadY(look) - 42;
  spawnFloatText(scene.floatTexts, x + nextRange(scene.jitter, -10, 10), y, value, kind);
}

export function drawNumbers(scene: Scene, viewport: Viewport): void {
  const { ctx, floatTexts, local } = scene;
  const image = scene.atlas.images[VARIANT_NORMAL];
  if (image === undefined) return;
  local[0] = NUMBER_SCALE;
  local[1] = 0;
  local[2] = 0;
  local[3] = NUMBER_SCALE;
  for (let i = 0; i < floatTexts.count; i++) {
    const text = floatTexts.items[i];
    if (text === undefined) continue;
    const progress = text.ageMs / FLOAT_LIFE_MS;
    // Szybki start, łagodne wyhamowanie; zanikanie dopiero pod koniec.
    local[5] = text.y - FLOAT_RISE * (1 - (1 - progress) * (1 - progress));
    ctx.globalAlpha = progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4;

    const heal = text.kind === FLOAT_KIND_HEAL;
    const digits = digitCount(text.value);
    // Leczenie ma przed cyframi znak plus (glif o indeksie -1).
    const first = heal ? -1 : 0;
    let x = text.x - ((digits - first - 1) * NUMBER_ADVANCE) / 2;
    for (let d = first; d < digits; d++) {
      const sprite =
        d < 0
          ? scene.plusSprite
          : scene.digitSprites[(heal ? 10 : 0) + digitAt(text.value, digits, d)];
      if (sprite !== null && sprite !== undefined) {
        local[4] = x;
        blit(scene, image, sprite, local, 0, viewport);
      }
      x += NUMBER_ADVANCE;
    }
  }
  ctx.globalAlpha = 1;
}
