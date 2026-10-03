// Rysowanie jednostki w walce: poza z animatora, macierze kości, postać (draw-rig.ts), pasek HP
// z liczbą życia.
// Gorąca ścieżka: bez alokacji.
import {
  type Battle,
  isAlive,
  STATUS_ATTACKING,
  STATUS_DEAD,
  STATUS_EMPTY,
  TEAM_SIZE,
} from '../sim/index.ts';
import { attackProgress, DEATH_MS, updateUnitPose } from './animation.ts';
import { VARIANT_NORMAL } from './atlas.ts';
import { debugOptions, debugRange } from './debug.ts';
import { drawRigParts, drawString } from './draw-rig.ts';
import { digitAt, digitCount } from './float-text.ts';
import { keepOnStage } from './reach.ts';
import { computeBoneMatrices, rootMatrix } from './rig.ts';
import { blit, FEET_Y, type Scene, UPPER_BODY, unitFacing } from './scene.ts';
import type { Viewport } from './viewport.ts';

const HP_BACK = '#241f3d';
const HP_PLAYER = '#8db35a';
const HP_ENEMY = '#c9463d';
const HP_BAR_WIDTH = 46;
const HP_BAR_HEIGHT = 5;
/** Odstęp górnej krawędzi paska od czubka głowy. */
const HP_BAR_RISE = 12;
/** Liczba życia nad paskiem: skala cyfr, odstęp między nimi i wysokość ich środka nad paskiem. */
const HP_NUMBER_SCALE = 1.6;
const HP_NUMBER_ADVANCE = 9.2;
const HP_NUMBER_RISE = 10;
/** Indeks pierwszej cyfry zestawu `hp` w `scene.digitSprites`. */
const HP_DIGITS = 20;
const HALF_PI = Math.PI / 2;

function drawHpBar(scene: Scene, battle: Battle, unit: number, x: number, top: number): void {
  const { ctx } = scene;
  const maxHp = battle.specs.maxHp[unit] ?? 1;
  const hp = battle.state.hp[unit] ?? 0;
  const fraction = hp <= 0 ? 0 : hp >= maxHp ? 1 : hp / maxHp;
  ctx.fillStyle = HP_BACK;
  ctx.fillRect(x - HP_BAR_WIDTH / 2 - 1, top - 1, HP_BAR_WIDTH + 2, HP_BAR_HEIGHT + 2);
  ctx.fillStyle = unit < TEAM_SIZE ? HP_PLAYER : HP_ENEMY;
  ctx.fillRect(x - HP_BAR_WIDTH / 2, top, HP_BAR_WIDTH * fraction, HP_BAR_HEIGHT);
}

/**
 * Bieżące życie jako liczba nad paskiem: sam pasek pokazuje ułamek, liczba daje skalę.
 * Cyfry z atlasu, wyliczane dzieleniem całkowitym, bez tworzenia napisu.
 *
 * Środek liczby przychodzi w `scene.local[4]` i `[5]`, nie w argumentach: ułamkową liczbę
 * przekazaną do funkcji, której silnik nie wbudował, V8 pakuje w obiekt na stercie (pomiar:
 * 12 B na jednostkę na klatkę; docs/ARCHITECTURE.md §5.7).
 */
function drawHpNumber(scene: Scene, battle: Battle, unit: number, viewport: Viewport): void {
  const image = scene.atlas.images[VARIANT_NORMAL];
  const hp = battle.state.hp[unit] ?? 0;
  if (image === undefined || hp <= 0) return;
  const { local } = scene;
  local[0] = HP_NUMBER_SCALE;
  local[1] = 0;
  local[2] = 0;
  local[3] = HP_NUMBER_SCALE;
  const digits = digitCount(hp);
  let at = (local[4] ?? 0) - ((digits - 1) * HP_NUMBER_ADVANCE) / 2;
  for (let d = 0; d < digits; d++) {
    const sprite = scene.digitSprites[HP_DIGITS + digitAt(hp, digits, d)];
    if (sprite !== null && sprite !== undefined) {
      local[4] = at;
      blit(scene, image, sprite, local, 0, viewport);
    }
    at += HP_NUMBER_ADVANCE;
  }
}

/** Aktualizuje animację jednostki i rysuje ją. `frameMs` to czas animacji od poprzedniej klatki. */
export function drawUnit(
  scene: Scene,
  battle: Battle,
  unit: number,
  viewport: Viewport,
  alpha: number,
  frameMs: number,
): void {
  const look = scene.looks[unit];
  const { state } = battle;
  const status = state.status[unit] ?? STATUS_EMPTY;
  if (look === null || look === undefined || status === STATUS_EMPTY) return;

  const { ctx, animator, matrices } = scene;
  const facing = unitFacing(unit);
  const prev = state.prevX[unit] ?? 0;
  const arenaX = (prev + ((state.x[unit] ?? 0) - prev) * alpha) * scene.camera.scale;
  let x = scene.camera.offset + arenaX;
  const feetY = FEET_Y;

  updateUnitPose(
    animator,
    unit,
    look,
    status,
    state.swingTick[unit] ?? -1,
    battle.specs.swingTicks[unit] ?? 1,
    alpha,
    x,
    frameMs,
  );

  // Śmierć: postać pada do tyłu wokół stóp i zanika.
  let fall = 0;
  if (status === STATUS_DEAD) {
    const death = animator.deathMs[unit] ?? -1;
    const progress = death < 0 ? 1 : death / DEATH_MS;
    if (progress >= 1) return;
    fall = progress * progress;
  }
  // Postać przy krawędzi pola (odrzut, padanie po śmierci) nie może wystawać poza scenę.
  x = keepOnStage(
    x,
    facing,
    scene.reachBack[unit] ?? 0,
    scene.reachFront[unit] ?? 0,
    scene.reachHeight[unit] ?? 0,
    fall,
  );

  const { rig, scale } = look;
  const poseOffset = unit * animator.channels;
  const bob = animator.pose[poseOffset + rig.boneCount] ?? 0;
  const dx = animator.pose[poseOffset + rig.boneCount + 1] ?? 0;
  rootMatrix(
    scene.root,
    x,
    feetY,
    -facing * fall * HALF_PI,
    facing * scale,
    scale,
    dx,
    bob - rig.hipHeight,
  );
  computeBoneMatrices(rig, animator.pose, poseOffset, scene.root, matrices, 0);

  ctx.globalAlpha = 1 - fall;
  drawRigParts(scene, unit, look, viewport, (animator.flashMs[unit] ?? 0) > 0);

  const { string } = look;
  if (string !== null) {
    let pulled = false;
    if (status === STATUS_ATTACKING && string.clip === look.attack) {
      const progress = attackProgress(
        state.swingTick[unit] ?? 0,
        battle.specs.swingTicks[unit] ?? 1,
        alpha,
      );
      pulled = progress >= string.from && progress <= string.to;
    }
    drawString(scene, look, string, unit, pulled, viewport);
  }
  ctx.globalAlpha = 1;

  if (!isAlive(status)) return;
  const s = viewport.scale;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  const barTop = feetY - (rig.hipHeight + UPPER_BODY) * scale - HP_BAR_RISE;
  drawHpBar(scene, battle, unit, x, barTop);
  scene.local[4] = x;
  scene.local[5] = barTop - HP_NUMBER_RISE;
  drawHpNumber(scene, battle, unit, viewport);

  if (import.meta.env.DEV && debugOptions.ranges) {
    const target = state.target[unit] ?? -1;
    const range = (battle.specs.range[unit] ?? 0) * scene.camera.scale;
    const targetX =
      target < 0 ? -1 : scene.camera.offset + (state.x[target] ?? 0) * scene.camera.scale;
    const targetY = FEET_Y;
    debugRange(ctx, x, feetY, facing, range, targetX, targetY);
  }
}
