// Wspólny stan renderera walki i rozmieszczenie jednostek na scenie. Wszystkie bufory
// powstają raz, przy tworzeniu renderera; rysowanie tylko je wypełnia i czyta.
import type { Pool } from '../core/pool.ts';
import type { Rng } from '../core/rng.ts';
import { type Battle, TEAM_SIZE } from '../sim/index.ts';
import type { Animator, UnitLook } from './animation.ts';
import type { Atlas, Sprite } from './atlas.ts';
import { type Camera, GROUND_Y } from './camera.ts';
import { debugStats } from './debug.ts';
import type { FloatText } from './float-text.ts';

export interface Scene {
  readonly ctx: CanvasRenderingContext2D;
  readonly atlas: Atlas;
  readonly camera: Camera;
  readonly animator: Animator;
  /** Macierz korzenia i macierze kości aktualnie rysowanej jednostki. */
  readonly root: Float32Array;
  readonly matrices: Float32Array;
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
 * Rysuje sprite w bieżącej transformacji, z lewym górnym rogiem w (dx, dy) w jednostkach rigu.
 * Jedyne miejsce wywołania drawImage w rendererze walki.
 */
export function blit(
  scene: Scene,
  image: CanvasImageSource,
  sprite: Sprite,
  dx: number,
  dy: number,
): void {
  scene.ctx.drawImage(
    image,
    sprite.sx,
    sprite.sy,
    sprite.sw,
    sprite.sh,
    dx,
    dy,
    sprite.width,
    sprite.height,
  );
  if (import.meta.env.DEV) debugStats.drawCalls++;
}
