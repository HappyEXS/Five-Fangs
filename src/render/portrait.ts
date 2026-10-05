// Miniaturki postaci („zdjęcia profilowe”): popiersie wycięte z prawdziwej postaci, czyli z rigu
// i skórki z atlasu, w kadrze opisanym w danych rigu (`portrait`). Powstają raz, po wczytaniu
// atlasu, na wspólnym arkuszu poza ekranem; interfejs dostaje je kopiowane na własne małe
// canvasy. Nic tu nie działa w pętli klatek, więc ten moduł może alokować.
import type { UnitVisual } from '../content/compile.ts';
import type { UnitLook } from './animation.ts';
import { sampleClip } from './clips.ts';
import { drawRigParts, drawString } from './draw-rig.ts';
import { compileRigs, type RenderAssets, resolveLook, skinParts } from './looks.ts';
import {
  type CompiledPortrait,
  type CompiledRig,
  computeBoneMatrices,
  MATRIX_SIZE,
  rootMatrix,
} from './rig.ts';
import { createScene } from './scene.ts';
import { createViewport } from './viewport.ts';

/**
 * Bok miniaturki w pikselach. Największa miniaturka w interfejsie ma ok. 4,5 em, czyli ok. 120 px
 * na ekranie o szerokości 1920 px; atlas zastępczy ma 3 px na jednostkę rigu, więc większy
 * obrazek tylko rozmywałby te same piksele.
 */
export const PORTRAIT_PIXELS = 128;

export interface PortraitSheet {
  /**
   * Kopiuje miniaturkę spod klucza `key` na cały `target` (ustawia mu rozmiar bufora, tło
   * zostaje przezroczyste). Gdy takiej miniaturki nie ma, czyści `target` i zwraca false.
   */
  paint(target: HTMLCanvasElement, key: string): boolean;
}

/**
 * Kadr miniaturki jednostki: własny z treści (`visual.portrait`), a bez niego kadr rigu.
 * Własny kadr liczy się od tej samej kości co kadr rigu.
 */
export function portraitFrame(rig: CompiledRig, visual: UnitVisual): CompiledPortrait {
  const own = visual.portrait;
  if (own === null) return rig.portrait;
  return { bone: rig.portrait.bone, x: own.x, y: own.y, size: own.size };
}

/**
 * Ustawia w `matrices` kości postaci w pozie miniaturki: pierwsza klatka klipu idle, postać
 * patrzy w prawo, jednostką jest jednostka rigu, a lewy górny róg kadru leży w punkcie (0, 0).
 * Kadr (bok `portrait.size`) jest wyśrodkowany na punkcie swojej kości, ale się z nią nie
 * obraca. `pose` i `root` to bufory robocze.
 */
export function posePortrait(
  look: UnitLook,
  portrait: CompiledPortrait,
  pose: Float32Array,
  root: Float32Array,
  matrices: Float32Array,
): void {
  const { rig } = look;
  sampleClip(look.idle, 0, look.rest, pose, 0);
  const bob = pose[rig.boneCount] ?? 0;
  const dx = pose[rig.boneCount + 1] ?? 0;
  rootMatrix(root, 0, 0, 0, 1, 1, dx, bob);
  computeBoneMatrices(rig, pose, 0, root, matrices, 0);

  const m = portrait.bone * MATRIX_SIZE;
  const centerX =
    (matrices[m] ?? 1) * portrait.x + (matrices[m + 2] ?? 0) * portrait.y + (matrices[m + 4] ?? 0);
  const centerY =
    (matrices[m + 1] ?? 0) * portrait.x +
    (matrices[m + 3] ?? 1) * portrait.y +
    (matrices[m + 5] ?? 0);
  const left = centerX - portrait.size / 2;
  const top = centerY - portrait.size / 2;
  // Przesunięcie korzenia przenosi się na każdą kość bez zmian, więc wystarczy przesunąć macierze.
  for (let bone = 0; bone < rig.boneCount; bone++) {
    const at = bone * MATRIX_SIZE;
    matrices[at + 4] = (matrices[at + 4] ?? 0) - left;
    matrices[at + 5] = (matrices[at + 5] ?? 0) - top;
  }
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D is not available');
  return ctx;
}

/**
 * Rysuje miniaturki jednostek z `visuals` (klucz, zwykle id jednostki, i jej wygląd). Jednostki
 * o tym samym rigu, skórce, postawie i kadrze dzielą jedną miniaturkę. Wymaga DOM; rzuca, gdy wygląd
 * odwołuje się do czegoś, czego rig nie ma.
 */
export function createPortraitSheet(
  assets: RenderAssets,
  visuals: Iterable<readonly [string, UnitVisual]>,
): PortraitSheet {
  const rigs = compileRigs(assets.rigs);
  /** Wyglądy do narysowania w kolejności komórek arkusza i komórka każdego klucza. */
  const looks: UnitVisual[] = [];
  const cellOfLook = new Map<string, number>();
  const cellOf = new Map<string, number>();
  for (const [key, visual] of visuals) {
    const frame = visual.portrait;
    const frameKey = frame === null ? '' : `${frame.x},${frame.y},${frame.size}`;
    const lookKey = `${visual.rig}/${visual.skin}/${visual.stance}/${frameKey}`;
    let at = cellOfLook.get(lookKey);
    if (at === undefined) {
      at = looks.length;
      looks.push(visual);
      cellOfLook.set(lookKey, at);
    }
    cellOf.set(key, at);
  }

  // Arkusz to kwadratowa siatka komórek; rysujemy każdą na osobnym canvasie roboczym, żeby
  // części wystające poza kadr (broń, ręce) nie wchodziły w sąsiednie miniaturki.
  const columns = Math.max(1, Math.ceil(Math.sqrt(looks.length)));
  const sheet = document.createElement('canvas');
  sheet.width = columns * PORTRAIT_PIXELS;
  sheet.height = Math.max(1, Math.ceil(looks.length / columns)) * PORTRAIT_PIXELS;
  const sheetCtx = context(sheet);
  const cell = document.createElement('canvas');
  cell.width = PORTRAIT_PIXELS;
  cell.height = PORTRAIT_PIXELS;
  const ctx = context(cell);
  ctx.imageSmoothingQuality = 'high';
  const scene = createScene(ctx, assets.atlas, rigs.maxBones, rigs.maxChannels);
  const viewport = createViewport();

  looks.forEach((visual, at) => {
    const look = resolveLook(rigs, visual);
    const portrait = portraitFrame(look.rig, visual);
    posePortrait(look, portrait, scene.animator.target, scene.root, scene.matrices);
    scene.boneSprites.fill(null);
    skinParts(assets.atlas, look.rig, visual.skin).forEach((sprite, bone) => {
      scene.boneSprites[bone] = sprite;
    });
    viewport.scale = PORTRAIT_PIXELS / portrait.size;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, PORTRAIT_PIXELS, PORTRAIT_PIXELS);
    drawRigParts(scene, 0, look, viewport, false);
    if (look.string !== null) drawString(scene, look, look.string, 0, false, viewport);
    // Poza pętlą klatek i z całkowitymi współrzędnymi: `blit` dotyczy rysowania walki.
    sheetCtx.drawImage(
      cell,
      (at % columns) * PORTRAIT_PIXELS,
      Math.floor(at / columns) * PORTRAIT_PIXELS,
    );
  });

  return {
    paint(target, key) {
      // Przypisanie rozmiaru czyści canvas, więc robimy to tylko przy faktycznej zmianie.
      if (target.width !== PORTRAIT_PIXELS) target.width = PORTRAIT_PIXELS;
      if (target.height !== PORTRAIT_PIXELS) target.height = PORTRAIT_PIXELS;
      const out = context(target);
      out.clearRect(0, 0, PORTRAIT_PIXELS, PORTRAIT_PIXELS);
      const at = cellOf.get(key);
      if (at === undefined) return false;
      out.drawImage(
        sheet,
        (at % columns) * PORTRAIT_PIXELS,
        Math.floor(at / columns) * PORTRAIT_PIXELS,
        PORTRAIT_PIXELS,
        PORTRAIT_PIXELS,
        0,
        0,
        PORTRAIT_PIXELS,
        PORTRAIT_PIXELS,
      );
      return true;
    },
  };
}
