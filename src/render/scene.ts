// Wspólny stan renderera walki i rozmieszczenie jednostek na scenie. Wszystkie bufory
// powstają raz, przy tworzeniu renderera; rysowanie tylko je wypełnia i czyta.
import type { Pool } from '../core/pool.ts';
import { createRng, type Rng } from '../core/rng.ts';
import { type Battle, MAX_UNITS, TEAM_SIZE } from '../sim/index.ts';
import { type Animator, createAnimator, type UnitLook } from './animation.ts';
import type { Atlas, Sprite } from './atlas.ts';
import { type Camera, createCamera, GROUND_Y } from './camera.ts';
import { debugStats } from './debug.ts';
import { createFloatTexts, type FloatText } from './float-text.ts';
import { MATRIX_SIZE } from './rig.ts';
import type { Viewport } from './viewport.ts';

export interface Scene {
  readonly ctx: CanvasRenderingContext2D;
  readonly atlas: Atlas;
  readonly camera: Camera;
  readonly animator: Animator;
  /** Macierz korzenia i macierze kości aktualnie rysowanej jednostki. */
  readonly root: Float32Array;
  readonly matrices: Float32Array;
  /** Macierz robocza sprite'ów rysowanych bez kości: pociski, cyfry, strzała na cięciwie. */
  readonly local: Float32Array;
  /** Największa liczba kości wśród rigów; rozmiar wiersza w `boneSprites`. */
  readonly maxBones: number;
  /** Stan przygotowany w beginBattle; indeks = unitId. */
  readonly looks: (UnitLook | null)[];
  readonly boneSprites: (Sprite | null)[];
  readonly projectileSprites: (Sprite | null)[];
  /** Liczby obrażeń i leczenia. */
  readonly floatTexts: Pool<FloatText>;
  /** RNG wyłącznie dla efektów kosmetycznych. */
  readonly jitter: Rng;
  /** Cyfry 0..9 zestawu obrażeń, potem 0..9 zestawu leczenia. */
  readonly digitSprites: (Sprite | null)[];
  readonly plusSprite: Sprite | null;
  battle: Battle | null;
}

/**
 * Tworzy stan renderera z buforami na `maxBones` kości i `maxChannels` kanałów pozy
 * na jednostkę. Jedyna alokacja buforów; rysowanie tylko je wypełnia.
 */
export function createScene(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  maxBones: number,
  maxChannels: number,
): Scene {
  const digitSprites: (Sprite | null)[] = [];
  for (const set of ['dmg', 'heal']) {
    for (let digit = 0; digit <= 9; digit++) {
      digitSprites.push(atlas.sprites.get(`fx/${set}_${digit}`) ?? null);
    }
  }
  return {
    ctx,
    atlas,
    camera: createCamera(),
    animator: createAnimator(maxChannels),
    root: new Float32Array(MATRIX_SIZE),
    matrices: new Float32Array(maxBones * MATRIX_SIZE),
    local: new Float32Array(MATRIX_SIZE),
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
}

/**
 * Sojusznicy mogą stać w tym samym punkcie osi walki. Żeby byli rozróżnialni, każdy slot
 * ma własną ścieżkę na pasie ziemi: slot 0 najbliżej widza, dalsze sloty wyżej, odrobinę
 * w tył szyku i rysowane wcześniej. To wyłącznie prezentacja; w symulacji pole jest osią.
 */
const LANE_FRONT = 40;
const LANE_STEP = 10;
const LANE_SHIFT = 7;

/** Wysokość postaci nad biodrami w jednostkach rigu (tułów i głowa). */
export const UPPER_BODY = 48;

/** Kierunek, w który patrzy jednostka: gracz w prawo, przeciwnik w lewo. */
export function unitFacing(unit: number): number {
  return unit < TEAM_SIZE ? 1 : -1;
}

export function unitSlot(unit: number): number {
  return unit < TEAM_SIZE ? unit : unit - TEAM_SIZE;
}

/** Wysokość stóp jednostki ze slotu `slot` w jednostkach logicznych sceny. */
export function laneFeetY(slot: number): number {
  return GROUND_Y + LANE_FRONT - slot * LANE_STEP;
}

/** Pozycja X jednostki na scenie dla pozycji `worldX` z symulacji (podjednostki). */
export function unitSceneX(scene: Scene, unit: number, worldX: number): number {
  return worldX * scene.camera.scale - unitFacing(unit) * unitSlot(unit) * LANE_SHIFT;
}

/** Wysokość czubka głowy jednostki na scenie. */
export function unitHeadY(look: UnitLook, slot: number): number {
  return laneFeetY(slot) - (look.rig.hipHeight + UPPER_BODY) * look.scale;
}

/**
 * Rysuje sprite z punktem obrotu w początku układu macierzy `matrix[m..m+5]` (jednostki
 * logiczne sceny). Jedyne miejsce wywołania drawImage w rendererze walki.
 *
 * Przesunięcie o pivot i skala piksel → jednostka rigu są wliczone w transformację, a drawImage
 * dostaje wyłącznie liczby całkowite. Ułamkowe argumenty drawImage silnik V8 pakuje w obiekty
 * na stercie (12 B każdy), a setTransform przyjmuje je bez alokacji. Z tego samego powodu
 * macierz i skala widoku przychodzą jako tablica i obiekt, nie jako liczby.
 * Pomiar: docs/ARCHITECTURE.md §5.7.
 */
export function blit(
  scene: Scene,
  image: CanvasImageSource,
  sprite: Sprite,
  matrix: Float32Array,
  m: number,
  viewport: Viewport,
): void {
  const s = viewport.scale;
  const k = sprite.unitsPerPixel * s;
  const a = matrix[m] ?? 1;
  const b = matrix[m + 1] ?? 0;
  const c = matrix[m + 2] ?? 0;
  const d = matrix[m + 3] ?? 1;
  const ox = sprite.offsetX;
  const oy = sprite.offsetY;
  scene.ctx.setTransform(
    a * k,
    b * k,
    c * k,
    d * k,
    (a * ox + c * oy + (matrix[m + 4] ?? 0)) * s,
    (b * ox + d * oy + (matrix[m + 5] ?? 0)) * s,
  );
  scene.ctx.drawImage(
    image,
    sprite.sx,
    sprite.sy,
    sprite.sw,
    sprite.sh,
    0,
    0,
    sprite.sw,
    sprite.sh,
  );
  if (import.meta.env.DEV) debugStats.drawCalls++;
}
