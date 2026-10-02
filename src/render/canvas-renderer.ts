// Renderer walki na Canvas 2D. Gorąca ścieżka (`draw`) nie alokuje: żadnych obiektów,
// tablic, domknięć ani napisów tworzonych co klatkę. Wszystkie bufory powstają raz.
import type { UnitVisual } from '../content/compile.ts';
import type { RawRig } from '../content/schema-rig.ts';
import { createRng, nextRange } from '../core/rng.ts';
import {
  type Battle,
  EVENT_DAMAGED,
  EVENT_HEALED,
  type EventBuffer,
  isAlive,
  MAX_PROJECTILES,
  MAX_UNITS,
  STATUS_ATTACKING,
  STATUS_DEAD,
  STATUS_EMPTY,
  TEAM_SIZE,
} from '../sim/index.ts';
import {
  animatorOnEvents,
  attackProgress,
  createAnimator,
  DEATH_MS,
  resetAnimator,
  type UnitLook,
  updateUnitPose,
} from './animation.ts';
import { type Atlas, type Sprite, VARIANT_DARK, VARIANT_NORMAL, VARIANT_WHITE } from './atlas.ts';
import { drawBackground } from './background.ts';
import { type Camera, createCamera, fitCamera, GROUND_Y } from './camera.ts';
import {
  clearFloatTexts,
  createFloatTexts,
  digitAt,
  digitCount,
  FLOAT_KIND_DAMAGE,
  FLOAT_KIND_HEAL,
  FLOAT_LIFE_MS,
  FLOAT_RISE,
  spawnFloatText,
  updateFloatTexts,
} from './float-text.ts';
import type { Renderer } from './renderer.ts';
import {
  type CompiledRig,
  type CompiledString,
  compileRig,
  computeBoneMatrices,
  MATRIX_SIZE,
  rootMatrix,
} from './rig.ts';
import type { Viewport } from './viewport.ts';

const STRING_COLOR = '#e9e2cf';
/** Skala cyfr liczb nad jednostkami i odstęp między nimi, w jednostkach logicznych sceny. */
const NUMBER_SCALE = 2;
const NUMBER_ADVANCE = 11;
const HP_BACK = '#11151c';
const HP_PLAYER = '#7fd36b';
const HP_ENEMY = '#e0705c';
const HP_BAR_WIDTH = 46;
const HP_BAR_HEIGHT = 5;

/**
 * Sojusznicy mogą stać w tym samym punkcie osi walki. Żeby byli rozróżnialni, każdy slot
 * ma własną ścieżkę na pasie ziemi: slot 0 najbliżej widza, dalsze sloty wyżej, odrobinę
 * w tył szyku i rysowane wcześniej. To wyłącznie prezentacja; w symulacji pole jest osią.
 */
const LANE_FRONT = 40;
const LANE_STEP = 10;
const LANE_SHIFT = 7;
/** Wysokość postaci nad biodrami w jednostkach rigu (tułów i głowa), do ustawienia paska HP. */
const UPPER_BODY = 48;
/** Wysokość lotu pocisku nad stopami strzelca w jednostkach rigu. */
const PROJECTILE_HEIGHT = 43;
const HALF_PI = Math.PI / 2;

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

  const camera: Camera = createCamera();
  const animator = createAnimator(maxChannels);
  const root = new Float32Array(MATRIX_SIZE);
  const matrices = new Float32Array(maxBones * MATRIX_SIZE);
  // Stan przygotowany w beginBattle; indeks = unitId.
  const looks: (UnitLook | null)[] = new Array(MAX_UNITS).fill(null);
  const boneSprites: (Sprite | null)[] = new Array(MAX_UNITS * maxBones).fill(null);
  const projectileSprites: (Sprite | null)[] = new Array(MAX_UNITS).fill(null);
  let battle: Battle | null = null;

  // Liczby obrażeń i leczenia: cyfry z atlasu, rozrzut poziomy z RNG kosmetycznego.
  const floatTexts = createFloatTexts();
  const jitter = createRng(1);
  const digitSprites: (Sprite | null)[] = [];
  for (const set of ['dmg', 'heal']) {
    for (let digit = 0; digit <= 9; digit++) {
      digitSprites.push(atlas.sprites.get(`fx/${set}_${digit}`) ?? null);
    }
  }
  const plusSprite = atlas.sprites.get('fx/heal_plus') ?? null;

  /** Dodaje liczbę nad głową jednostki; pozycja ze stanu po ostatnim ticku. */
  function spawnNumber(current: Battle, unit: number, value: number, kind: number): void {
    const look = looks[unit];
    if (look === null || look === undefined) return;
    const facing = unit < TEAM_SIZE ? 1 : -1;
    const slot = unit < TEAM_SIZE ? unit : unit - TEAM_SIZE;
    const x = (current.state.x[unit] ?? 0) * camera.scale - facing * slot * LANE_SHIFT;
    const head =
      GROUND_Y + LANE_FRONT - slot * LANE_STEP - (look.rig.hipHeight + UPPER_BODY) * look.scale;
    spawnFloatText(floatTexts, x + nextRange(jitter, -10, 10), head - 20, value, kind);
  }

  function drawGlyph(
    image: CanvasImageSource,
    sprite: Sprite | null | undefined,
    s: number,
    x: number,
    y: number,
  ): void {
    if (sprite === null || sprite === undefined) return;
    const scale = NUMBER_SCALE * s;
    ctx.setTransform(scale, 0, 0, scale, x * s, y * s);
    ctx.drawImage(
      image,
      sprite.sx,
      sprite.sy,
      sprite.sw,
      sprite.sh,
      -sprite.pivotX,
      -sprite.pivotY,
      sprite.width,
      sprite.height,
    );
  }

  function drawNumbers(viewport: Viewport): void {
    const image = atlas.images[VARIANT_NORMAL];
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
        drawGlyph(image, plusSprite, viewport.scale, x, y);
        x += NUMBER_ADVANCE;
      }
      for (let d = 0; d < digits; d++) {
        const sprite = digitSprites[(heal ? 10 : 0) + digitAt(text.value, digits, d)];
        drawGlyph(image, sprite, viewport.scale, x, y);
        x += NUMBER_ADVANCE;
      }
    }
    ctx.globalAlpha = 1;
  }

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
    // Cięciwa jest naciągana tylko w klipie, dla którego ją zdefiniowano.
    const string = rig.strings.get(visual.stance) ?? null;
    return { rig, rest, idle, walk, attack, scale: rig.scale * visual.scale, string };
  }

  /**
   * Cięciwa i strzała na cięciwie: elementy rysowane wektorowo między punktami kości,
   * z macierzy policzonych przed chwilą dla tej jednostki.
   */
  function drawString(
    look: UnitLook,
    string: CompiledString,
    unit: number,
    pulled: boolean,
    s: number,
  ): void {
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
    const sprite = projectileSprites[unit];
    const image = atlas.images[VARIANT_NORMAL];
    if (sprite === null || sprite === undefined || image === undefined) return;
    const dirX = e - handX;
    const dirY = f - handY;
    const length = Math.hypot(dirX, dirY);
    if (length === 0) return;
    const ux = (dirX / length) * look.scale * s;
    const uy = (dirY / length) * look.scale * s;
    ctx.setTransform(ux, uy, -uy, ux, handX * s, handY * s);
    ctx.drawImage(
      image,
      sprite.sx,
      sprite.sy,
      sprite.sw,
      sprite.sh,
      -1,
      -sprite.pivotY,
      sprite.width,
      sprite.height,
    );
  }

  function drawHpBar(current: Battle, unit: number, x: number, top: number): void {
    const maxHp = current.specs.maxHp[unit] ?? 1;
    const hp = current.state.hp[unit] ?? 0;
    const fraction = hp <= 0 ? 0 : hp >= maxHp ? 1 : hp / maxHp;
    ctx.fillStyle = HP_BACK;
    ctx.fillRect(x - HP_BAR_WIDTH / 2 - 1, top - 1, HP_BAR_WIDTH + 2, HP_BAR_HEIGHT + 2);
    ctx.fillStyle = unit < TEAM_SIZE ? HP_PLAYER : HP_ENEMY;
    ctx.fillRect(x - HP_BAR_WIDTH / 2, top, HP_BAR_WIDTH * fraction, HP_BAR_HEIGHT);
  }

  function drawUnit(
    current: Battle,
    unit: number,
    viewport: Viewport,
    alpha: number,
    frameMs: number,
  ): void {
    const look = looks[unit];
    const { state } = current;
    const status = state.status[unit] ?? STATUS_EMPTY;
    if (look === null || look === undefined || status === STATUS_EMPTY) return;

    const facing = unit < TEAM_SIZE ? 1 : -1;
    const slot = unit < TEAM_SIZE ? unit : unit - TEAM_SIZE;
    const prev = state.prevX[unit] ?? 0;
    const x =
      (prev + ((state.x[unit] ?? 0) - prev) * alpha) * camera.scale - facing * slot * LANE_SHIFT;
    const feetY = GROUND_Y + LANE_FRONT - slot * LANE_STEP;

    updateUnitPose(
      animator,
      unit,
      look,
      status,
      state.swingTick[unit] ?? -1,
      current.specs.swingTicks[unit] ?? 1,
      alpha,
      x,
      frameMs,
    );

    // Śmierć: postać pada do tyłu wokół stóp i zanika.
    const death = animator.deathMs[unit] ?? -1;
    let fall = 0;
    if (status === STATUS_DEAD) {
      const progress = death < 0 ? 1 : death / DEATH_MS;
      if (progress >= 1) return;
      fall = progress * progress;
    }

    const { rig, scale } = look;
    const poseOffset = unit * animator.channels;
    const bob = animator.pose[poseOffset + rig.boneCount] ?? 0;
    const dx = animator.pose[poseOffset + rig.boneCount + 1] ?? 0;
    rootMatrix(
      root,
      x,
      feetY,
      -facing * fall * HALF_PI,
      facing * scale,
      scale,
      dx,
      bob - rig.hipHeight,
    );
    computeBoneMatrices(rig, animator.pose, poseOffset, root, matrices, 0);

    const flashing = (animator.flashMs[unit] ?? 0) > 0;
    const s = viewport.scale;
    ctx.globalAlpha = 1 - fall;
    for (let i = 0; i < rig.boneCount; i++) {
      const bone = rig.drawOrder[i] ?? 0;
      const sprite = boneSprites[unit * maxBones + bone];
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
      ctx.drawImage(
        image,
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
        -sprite.pivotX,
        -sprite.pivotY,
        sprite.width,
        sprite.height,
      );
    }
    const { string } = look;
    if (string !== null) {
      let pulled = false;
      if (status === STATUS_ATTACKING && string.clip === look.attack) {
        const progress = attackProgress(
          state.swingTick[unit] ?? 0,
          current.specs.swingTicks[unit] ?? 1,
          alpha,
        );
        pulled = progress >= string.from && progress <= string.to;
      }
      drawString(look, string, unit, pulled, s);
    }
    ctx.globalAlpha = 1;

    if (isAlive(status)) {
      ctx.setTransform(s, 0, 0, s, 0, 0);
      drawHpBar(current, unit, x, feetY - (rig.hipHeight + UPPER_BODY) * scale - 12);
    }
  }

  function drawProjectiles(current: Battle, viewport: Viewport, alpha: number): void {
    const { state } = current;
    const image = atlas.images[VARIANT_NORMAL];
    if (image === undefined) return;
    const s = viewport.scale;
    for (let p = 0; p < state.projCount && p < MAX_PROJECTILES; p++) {
      const owner = state.projOwner[p] ?? 0;
      const sprite = projectileSprites[owner];
      const look = looks[owner];
      if (sprite === null || sprite === undefined || look === null || look === undefined) continue;
      const prev = state.projPrevX[p] ?? 0;
      const x = (prev + ((state.projX[p] ?? 0) - prev) * alpha) * camera.scale;
      const slot = owner < TEAM_SIZE ? owner : owner - TEAM_SIZE;
      const y = GROUND_Y + LANE_FRONT - slot * LANE_STEP - PROJECTILE_HEIGHT * look.scale;
      const direction = (state.projStep[p] ?? 1) > 0 ? 1 : -1;
      ctx.setTransform(direction * look.scale * s, 0, 0, look.scale * s, x * s, y * s);
      ctx.drawImage(
        image,
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
        -sprite.pivotX,
        -sprite.pivotY,
        sprite.width,
        sprite.height,
      );
    }
  }

  return {
    beginBattle(next: Battle, visuals: readonly (UnitVisual | null)[]): void {
      battle = next;
      fitCamera(camera, next.width);
      resetAnimator(animator);
      clearFloatTexts(floatTexts);
      boneSprites.fill(null);
      for (let unit = 0; unit < MAX_UNITS; unit++) {
        const visual = visuals[unit] ?? null;
        if (visual === null) {
          looks[unit] = null;
          projectileSprites[unit] = null;
          continue;
        }
        const look = resolveLook(visual);
        looks[unit] = look;
        look.rig.sprites.forEach((part, bone) => {
          boneSprites[unit * maxBones + bone] = atlas.sprites.get(`${visual.skin}/${part}`) ?? null;
        });
        projectileSprites[unit] =
          visual.projectileSprite === null
            ? null
            : (atlas.sprites.get(`fx/${visual.projectileSprite}`) ?? null);
      }
    },
    consume(events: EventBuffer): void {
      animatorOnEvents(animator, events);
      if (battle === null) return;
      for (let i = 0; i < events.count; i++) {
        const type = events.type[i];
        const value = events.b[i] ?? 0;
        if (value <= 0) continue;
        if (type === EVENT_DAMAGED) {
          spawnNumber(battle, events.a[i] ?? 0, value, FLOAT_KIND_DAMAGE);
        } else if (type === EVENT_HEALED) {
          spawnNumber(battle, events.a[i] ?? 0, value, FLOAT_KIND_HEAL);
        }
      }
    },
    draw(viewport: Viewport, alpha: number, frameMs: number): void {
      drawBackground(ctx, viewport);
      if (battle === null) return;
      updateFloatTexts(floatTexts, frameMs);
      // Od najdalszego slotu do najbliższego, żeby bliższe postacie zasłaniały dalsze.
      for (let slot = TEAM_SIZE - 1; slot >= 0; slot--) {
        drawUnit(battle, slot, viewport, alpha, frameMs);
        drawUnit(battle, TEAM_SIZE + slot, viewport, alpha, frameMs);
      }
      drawProjectiles(battle, viewport, alpha);
      drawNumbers(viewport);
      ctx.setTransform(viewport.scale, 0, 0, viewport.scale, 0, 0);
    },
    endBattle(): void {
      battle = null;
    },
  };
}
