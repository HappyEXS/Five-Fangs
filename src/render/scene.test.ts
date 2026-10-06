import { describe, expect, it } from 'vitest';
import { MAX_UNITS } from '../sim/index.ts';
import type { UnitLook } from './animation.ts';
import type { Atlas, Sprite } from './atlas.ts';
import { blit, copyLook, createScene, LOOK_ROWS, type Scene } from './scene.ts';
import type { Viewport } from './viewport.ts';

/** Kontekst zapisujący ostatnią transformację i argumenty drawImage. */
function recordingScene(): { scene: Scene; transform: number[]; drawn: unknown[][] } {
  const transform: number[] = [];
  const drawn: unknown[][] = [];
  const ctx = {
    setTransform(...values: number[]) {
      transform.length = 0;
      transform.push(...values);
    },
    drawImage(...args: unknown[]) {
      drawn.push(args);
    },
  };
  // Test dotyka tylko `ctx`; reszta sceny nie bierze udziału w `blit`.
  return { scene: { ctx } as unknown as Scene, transform, drawn };
}

/** Punkt (px, py) w pikselach sprite'a po transformacji ustawionej przez blit. */
function mapped(transform: readonly number[], px: number, py: number): [number, number] {
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = transform;
  return [a * px + c * py + e, b * px + d * py + f];
}

const sprite: Sprite = {
  sx: 12,
  sy: 30,
  sw: 24,
  sh: 32,
  width: 12,
  height: 16,
  offsetX: -4.5,
  offsetY: -3,
  unitsPerPixel: 0.5,
};
const image = {} as CanvasImageSource;

describe('blit', () => {
  it('przekazuje do drawImage wyłącznie liczby całkowite: prostokąt atlasu i ten sam rozmiar', () => {
    const { scene, drawn } = recordingScene();
    const viewport = { scale: 1.5 } as Viewport;
    blit(scene, image, sprite, new Float32Array([1, 0, 0, 1, 0, 0]), 0, viewport);
    expect(drawn).toEqual([[image, 12, 30, 24, 32, 0, 0, 24, 32]]);
  });

  it('umieszcza punkt obrotu sprite’a w początku układu macierzy', () => {
    const { scene, transform } = recordingScene();
    const viewport = { scale: 2 } as Viewport;
    blit(scene, image, sprite, new Float32Array([1, 0, 0, 1, 100, 50]), 0, viewport);
    // Lewy górny róg leży o (offsetX, offsetY) od pivota, prawy dolny o rozmiar dalej.
    expect(mapped(transform, 0, 0)).toEqual([(100 - 4.5) * 2, (50 - 3) * 2]);
    expect(mapped(transform, 24, 32)).toEqual([(100 - 4.5 + 12) * 2, (50 - 3 + 16) * 2]);
    // Pivot (9, 6) w pikselach sprite'a trafia dokładnie w początek układu.
    expect(mapped(transform, 9, 6)).toEqual([200, 100]);
  });

  it('stosuje obrót, odbicie i skalę macierzy kości czytanej od indeksu m', () => {
    const { scene, transform } = recordingScene();
    const viewport = { scale: 1 } as Viewport;
    // Druga macierz w tablicy: obrót o 90° z odbiciem w osi X i skalą 3.
    const matrices = new Float32Array([9, 9, 9, 9, 9, 9, 0, 3, 3, 0, 10, 20]);
    blit(scene, image, sprite, matrices, 6, viewport);
    // Punkt (u, v) w jednostkach rigu → (3v + 10, 3u + 20).
    expect(mapped(transform, 0, 0)).toEqual([3 * -3 + 10, 3 * -4.5 + 20]);
    expect(mapped(transform, 24, 32)).toEqual([3 * (-3 + 16) + 10, 3 * (-4.5 + 12) + 20]);
  });
});

describe('copyLook', () => {
  it('przepisuje wygląd wzorca do miejsca przyzwanego i nie rusza pozostałych wierszy', () => {
    const atlas = { sprites: new Map<string, Sprite>() } as unknown as Atlas;
    const scene = createScene({} as CanvasRenderingContext2D, atlas, 3, 4);
    expect(scene.looks).toHaveLength(LOOK_ROWS);
    expect(scene.boneSprites).toHaveLength(LOOK_ROWS * 3);

    // Wzorzec przyzywanego przez jednostkę 2 leży w wierszu MAX_UNITS + 2.
    const template = MAX_UNITS + 2;
    const look = { scale: 0.6 } as unknown as UnitLook;
    const head = { ...sprite };
    const shot = { ...sprite, sx: 99 };
    scene.looks[template] = look;
    scene.boneSprites[template * 3 + 1] = head;
    scene.projectileSprites[template] = shot;
    scene.projectileHeights[template] = 12;
    scene.reachBack[template] = 5;
    scene.reachFront[template] = 7;
    scene.reachHeight[template] = 30;
    scene.headHeight[template] = 28;
    // W miejscu 11 stał wcześniej ktoś inny: jego części muszą zniknąć.
    scene.boneSprites[11 * 3 + 2] = { ...sprite, sx: 1 };

    copyLook(scene, template, 11);
    expect(scene.looks[11]).toBe(look);
    expect(scene.boneSprites.slice(11 * 3, 12 * 3)).toEqual([null, head, null]);
    expect(scene.projectileSprites[11]).toBe(shot);
    expect(scene.projectileHeights[11]).toBe(12);
    expect([
      scene.reachBack[11],
      scene.reachFront[11],
      scene.reachHeight[11],
      scene.headHeight[11],
    ]).toEqual([5, 7, 30, 28]);
    expect(scene.looks[10]).toBeNull();
    expect(scene.looks[12]).toBeNull();
  });
});
