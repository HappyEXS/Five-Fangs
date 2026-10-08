// Wspólny stan renderera walki i rozmieszczenie jednostek na scenie. Wszystkie bufory
// powstają raz, przy tworzeniu renderera; rysowanie tylko je wypełnia i czyta.
import type { BackdropId } from '../content/schema-progression.ts';
import type { Pool } from '../core/pool.ts';
import { createRng, type Rng } from '../core/rng.ts';
import { type Battle, isPlayerUnit, MAX_UNITS, SQUAD_UNITS } from '../sim/index.ts';
import { type Animator, createAnimator, type UnitLook } from './animation.ts';
import type { Atlas, Sprite } from './atlas.ts';
import { DEFAULT_BACKDROP } from './backdrops/index.ts';
import { type Camera, createCamera, GROUND_Y } from './camera.ts';
import { debugStats } from './debug.ts';
import { createFloatTexts, type FloatText } from './float-text.ts';
import { MATRIX_SIZE } from './rig.ts';
import type { Viewport } from './viewport.ts';

/**
 * Liczba wierszy w tablicach wyglądu: miejsca jednostek walki, a za nimi po jednym wzorcu na
 * jednostkę składu. Wzorzec `MAX_UNITS + unitId` trzyma wygląd tego, co dana jednostka przyzywa;
 * przy przyzwaniu renderer przepisuje go do miejsca, w którym przyzwany stanął (ADR 0020).
 */
export const LOOK_ROWS = MAX_UNITS + SQUAD_UNITS;

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
  /** Stan przygotowany w beginBattle; indeks = unitId albo wiersz wzorca przyzwanego. */
  readonly looks: (UnitLook | null)[];
  readonly boneSprites: (Sprite | null)[];
  readonly projectileSprites: (Sprite | null)[];
  /** Wysokość lotu pocisków jednostki nad linią stóp, w jednostkach logicznych sceny. */
  readonly projectileHeights: Float32Array;
  /** Liczby obrażeń i leczenia. */
  readonly floatTexts: Pool<FloatText>;
  /** RNG wyłącznie dla efektów kosmetycznych. */
  readonly jitter: Rng;
  /** Cyfry 0..9 zestawu obrażeń, potem leczenia, potem liczby życia nad paskiem. */
  readonly digitSprites: (Sprite | null)[];
  readonly plusSprite: Sprite | null;
  /** Znak uniku unoszący się nad postacią, która uniknęła trafienia. */
  readonly dodgeSprite: Sprite | null;
  /** Znaczki efektów obrażeń w czasie przy pasku życia; indeks to rodzaj efektu (ADR 0021). */
  readonly statusSprites: (Sprite | null)[];
  /** Jednostka rysowana na wierzchu pozostałych albo -1. */
  topUnit: number;
  /** Scena pokazowa: paski życia obu stron w kolorze gracza. */
  showcase: boolean;
  /** Tło świata, w którym toczy się walka albo który pokazuje mapa. */
  backdrop: BackdropId;
  /** Zasięg postaci per unitId (reach.ts): za plecami, przed sobą i w górę, w jednostkach sceny. */
  readonly reachBack: Float32Array;
  readonly reachFront: Float32Array;
  readonly reachHeight: Float32Array;
  /**
   * Wysokość, nad którą wisi pasek życia jednostki, w jednostkach sceny: czubek stojącej postaci,
   * ale nie niżej niż u człowieka o tej samej skali, żeby paski ludzi stały w jednej linii.
   */
  readonly headHeight: Float32Array;
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
  for (const set of ['dmg', 'heal', 'hp']) {
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
    looks: new Array<UnitLook | null>(LOOK_ROWS).fill(null),
    boneSprites: new Array<Sprite | null>(LOOK_ROWS * maxBones).fill(null),
    projectileSprites: new Array<Sprite | null>(LOOK_ROWS).fill(null),
    projectileHeights: new Float32Array(LOOK_ROWS),
    floatTexts: createFloatTexts(),
    jitter: createRng(1),
    digitSprites,
    plusSprite: atlas.sprites.get('fx/heal_plus') ?? null,
    dodgeSprite: atlas.sprites.get('fx/dodge') ?? null,
    // W kolejności DOT_BLEED, DOT_POISON.
    statusSprites: [atlas.sprites.get('fx/bleed') ?? null, atlas.sprites.get('fx/poison') ?? null],
    topUnit: -1,
    showcase: false,
    backdrop: DEFAULT_BACKDROP,
    reachBack: new Float32Array(LOOK_ROWS),
    reachFront: new Float32Array(LOOK_ROWS),
    reachHeight: new Float32Array(LOOK_ROWS),
    headHeight: new Float32Array(LOOK_ROWS),
    battle: null,
  };
}

/**
 * Scena jest płaska (decyzja autora gry z 2026-10-02): nie ma perspektywy ani ścieżek slotów.
 * Wszystkie postacie stoją stopami dokładnie na linii podłogi, a ich pozycja X na scenie to
 * pozycja z symulacji. Sojusznicy stojący w tym samym punkcie nakładają się na siebie.
 */
export const FEET_Y = GROUND_Y;

/** Wysokość postaci nad biodrami w jednostkach rigu (tułów i głowa). */
export const UPPER_BODY = 48;

/** Kierunek, w który patrzy jednostka: gracz w prawo, przeciwnik w lewo. */
export function unitFacing(unit: number): number {
  return isPlayerUnit(unit) ? 1 : -1;
}

/**
 * Przepisuje wygląd z wiersza `from` do wiersza `to`: przyzwana jednostka dostaje wygląd
 * przygotowany dla jej przyzywacza. Bez alokacji; wołane ze zdarzenia symulacji.
 */
export function copyLook(scene: Scene, from: number, to: number): void {
  const { maxBones, boneSprites } = scene;
  scene.looks[to] = scene.looks[from] ?? null;
  for (let bone = 0; bone < maxBones; bone++) {
    boneSprites[to * maxBones + bone] = boneSprites[from * maxBones + bone] ?? null;
  }
  scene.projectileSprites[to] = scene.projectileSprites[from] ?? null;
  scene.projectileHeights[to] = scene.projectileHeights[from] ?? 0;
  scene.reachBack[to] = scene.reachBack[from] ?? 0;
  scene.reachFront[to] = scene.reachFront[from] ?? 0;
  scene.reachHeight[to] = scene.reachHeight[from] ?? 0;
  scene.headHeight[to] = scene.headHeight[from] ?? 0;
}

/**
 * Wysokość nad stopami, nad którą wisi pasek życia: `stand` to zmierzony czubek stojącej
 * postaci (reach.ts). Postacie o ludzkiej budowie dostają wspólną wysokość z rigu, wyższe
 * (długa szyja, rogi, uszy) własną.
 */
export function headHeightOf(look: UnitLook, stand: number): number {
  return Math.max((look.rig.hipHeight + UPPER_BODY) * look.scale, stand);
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
