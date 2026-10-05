// Rysowanie pocisków i liczb obrażeń oraz leczenia. Gorąca ścieżka: bez alokacji.
import { nextRange } from '../core/rng.ts';
import { type Battle, MAX_PROJECTILES, PROJECTILE_AIMED } from '../sim/index.ts';
import { VARIANT_NORMAL } from './atlas.ts';
import {
  digitAt,
  digitCount,
  FLOAT_KIND_HEAL,
  FLOAT_LIFE_MS,
  FLOAT_RISE,
  spawnFloatText,
} from './float-text.ts';
import { blit, FEET_Y, type Scene } from './scene.ts';
import type { Viewport } from './viewport.ts';

/**
 * Pocisk wycelowany (cecha targetLast) leci łukiem nad wrogami, których mija: szczyt łuku to
 * ta część odległości strzelca od celu, nie więcej niż ARC_MAX jednostek sceny. Kończy lot na
 * wysokości piersi celu. To tylko wygląd: symulacja liczy pocisk na osi X.
 */
const ARC_RATIO = 0.3;
const ARC_MAX = 210;
const ARC_END_HEIGHT = 60;
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
  const { local, camera } = scene;
  for (let p = 0; p < state.projCount && p < MAX_PROJECTILES; p++) {
    const owner = state.projOwner[p] ?? 0;
    const sprite = scene.projectileSprites[owner];
    const look = scene.looks[owner];
    if (sprite === null || sprite === undefined || look === null || look === undefined) continue;
    const prev = state.projPrevX[p] ?? 0;
    const direction = (state.projStep[p] ?? 1) > 0 ? 1 : -1;
    const x = camera.offset + (prev + ((state.projX[p] ?? 0) - prev) * alpha) * camera.scale;
    const height = scene.projectileHeights[owner] ?? 0;
    const target = state.projTarget[p] ?? -1;
    local[0] = direction * look.scale;
    local[1] = 0;
    local[2] = 0;
    local[3] = look.scale;
    local[4] = x;
    local[5] = FEET_Y - height;
    if ((state.projMode[p] ?? 0) === PROJECTILE_AIMED && target >= 0) {
      // Łuk od strzelca do celu; pozycja celu także po jego śmierci, żeby pocisk nie spadł w locie.
      const from = camera.offset + (state.x[owner] ?? 0) * camera.scale;
      const to = camera.offset + (state.x[target] ?? 0) * camera.scale;
      const span = to - from;
      const distance = span < 0 ? -span : span;
      if (distance > 1) {
        const t = Math.min(1, Math.max(0, (x - from) / span));
        const rise = Math.min(ARC_MAX, distance * ARC_RATIO);
        local[5] = FEET_Y - (height + (ARC_END_HEIGHT - height) * t) - 4 * rise * t * (1 - t);
        if (t < 1) {
          // Pocisk obraca się wzdłuż toru: wektor styczny (1, nachylenie) w kierunku lotu.
          const slope = (height - ARC_END_HEIGHT - 4 * rise * (1 - 2 * t)) / distance;
          const length = Math.sqrt(1 + slope * slope);
          const tx = (direction * look.scale) / length;
          const ty = (slope * look.scale) / length;
          local[0] = tx;
          local[1] = ty;
          local[2] = -ty * direction;
          local[3] = tx * direction;
        }
      }
    }
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
  const x = scene.camera.offset + (battle.state.x[unit] ?? 0) * scene.camera.scale;
  // Start nad liczbą życia, która stoi tuż nad paskiem (draw-units.ts).
  const y = FEET_Y - (scene.headHeight[unit] ?? 0) - 42;
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
