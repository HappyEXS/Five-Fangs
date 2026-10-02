// Rysowanie postaci: poza z animatora, macierze kości, części z atlasu, cięciwa i pasek HP.
// Gorąca ścieżka: bez alokacji.
import {
  type Battle,
  isAlive,
  STATUS_ATTACKING,
  STATUS_DEAD,
  STATUS_EMPTY,
  TEAM_SIZE,
} from '../sim/index.ts';
import { attackProgress, DEATH_MS, type UnitLook, updateUnitPose } from './animation.ts';
import { VARIANT_DARK, VARIANT_NORMAL, VARIANT_WHITE } from './atlas.ts';
import { debugBone, debugOptions, debugRange } from './debug.ts';
import { type CompiledString, computeBoneMatrices, MATRIX_SIZE, rootMatrix } from './rig.ts';
import {
  blit,
  laneFeetY,
  type Scene,
  UPPER_BODY,
  unitFacing,
  unitSceneX,
  unitSlot,
} from './scene.ts';
import type { Viewport } from './viewport.ts';

const STRING_COLOR = '#e9e2cf';
const HP_BACK = '#11151c';
const HP_PLAYER = '#7fd36b';
const HP_ENEMY = '#e0705c';
const HP_BAR_WIDTH = 46;
const HP_BAR_HEIGHT = 5;
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
 * Cięciwa i strzała na cięciwie: elementy rysowane wektorowo między punktami kości,
 * z macierzy policzonych przed chwilą dla tej jednostki.
 */
function drawString(
  scene: Scene,
  look: UnitLook,
  string: CompiledString,
  unit: number,
  pulled: boolean,
  s: number,
): void {
  const { ctx, matrices } = scene;
  const m = string.bone * MATRIX_SIZE;
  const a = matrices[m] ?? 1;
  const b = matrices[m + 1] ?? 0;
  const c = matrices[m + 2] ?? 0;
  const d = matrices[m + 3] ?? 1;
  const e = matrices[m + 4] ?? 0;
  const f = matrices[m + 5] ?? 0;
  const x1 = a * string.ax + c * string.ay + e;
  const y1 = b * string.ax + d * string.ay + f;
  const x2 = a * string.bx + c * string.by + e;
  const y2 = b * string.bx + d * string.by + f;

  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.strokeStyle = STRING_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  if (!pulled) {
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }
  const p = string.pullBone * MATRIX_SIZE;
  const handX =
    (matrices[p] ?? 1) * string.pullX +
    (matrices[p + 2] ?? 0) * string.pullY +
    (matrices[p + 4] ?? 0);
  const handY =
    (matrices[p + 1] ?? 0) * string.pullX +
    (matrices[p + 3] ?? 1) * string.pullY +
    (matrices[p + 5] ?? 0);
  ctx.lineTo(handX, handY);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Strzała leży od dłoni w stronę majdanu łuku (pivot kości z cięciwą).
  const sprite = scene.projectileSprites[unit];
  const image = scene.atlas.images[VARIANT_NORMAL];
  if (sprite === null || sprite === undefined || image === undefined) return;
  const dirX = e - handX;
  const dirY = f - handY;
  const length = Math.hypot(dirX, dirY);
  if (length === 0) return;
  const ux = (dirX / length) * look.scale * s;
  const uy = (dirY / length) * look.scale * s;
  ctx.setTransform(ux, uy, -uy, ux, handX * s, handY * s);
  blit(scene, image, sprite, -1, -sprite.pivotY);
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

  const { ctx, animator, matrices, atlas } = scene;
  const facing = unitFacing(unit);
  const slot = unitSlot(unit);
  const prev = state.prevX[unit] ?? 0;
  const x = unitSceneX(scene, unit, prev + ((state.x[unit] ?? 0) - prev) * alpha);
  const feetY = laneFeetY(slot);

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

  const flashing = (animator.flashMs[unit] ?? 0) > 0;
  const s = viewport.scale;
  ctx.globalAlpha = 1 - fall;
  for (let i = 0; i < rig.boneCount; i++) {
    const bone = rig.drawOrder[i] ?? 0;
    const sprite = scene.boneSprites[unit * scene.maxBones + bone];
    if (sprite === null || sprite === undefined) continue;
    const variant = flashing
      ? VARIANT_WHITE
      : (rig.back[bone] ?? 0) === 1
        ? VARIANT_DARK
        : VARIANT_NORMAL;
    const image = atlas.images[variant];
    if (image === undefined) continue;
    const m = bone * MATRIX_SIZE;
    ctx.setTransform(
      (matrices[m] ?? 1) * s,
      (matrices[m + 1] ?? 0) * s,
      (matrices[m + 2] ?? 0) * s,
      (matrices[m + 3] ?? 1) * s,
      (matrices[m + 4] ?? 0) * s,
      (matrices[m + 5] ?? 0) * s,
    );
    blit(scene, image, sprite, -sprite.pivotX, -sprite.pivotY);
    if (import.meta.env.DEV && debugOptions.pivots) debugBone(ctx, sprite);
  }

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
    drawString(scene, look, string, unit, pulled, s);
  }
  ctx.globalAlpha = 1;

  if (!isAlive(status)) return;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  drawHpBar(scene, battle, unit, x, feetY - (rig.hipHeight + UPPER_BODY) * scale - 12);

  if (import.meta.env.DEV && debugOptions.ranges) {
    const target = state.target[unit] ?? -1;
    const range = (battle.specs.range[unit] ?? 0) * scene.camera.scale;
    const targetX = target < 0 ? -1 : unitSceneX(scene, target, state.x[target] ?? 0);
    const targetY = target < 0 ? 0 : laneFeetY(unitSlot(target));
    debugRange(ctx, x, feetY, facing, range, targetX, targetY);
  }
}
