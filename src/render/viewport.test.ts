import { describe, expect, it } from 'vitest';
import { createViewport, fitViewport, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './viewport.ts';

function fitted(width: number, height: number, dpr: number) {
  const viewport = createViewport();
  fitViewport(viewport, width, height, dpr);
  return viewport;
}

describe('viewport', () => {
  it('okno w rozdzielczości logicznej daje skalę 1 bez marginesów', () => {
    expect(fitted(LOGICAL_WIDTH, LOGICAL_HEIGHT, 1)).toEqual({
      cssLeft: 0,
      cssTop: 0,
      cssWidth: 1280,
      cssHeight: 720,
      pixelWidth: 1280,
      pixelHeight: 720,
      scale: 1,
    });
  });

  it('większe okno 16:9 skaluje scenę', () => {
    const v = fitted(1920, 1080, 1);
    expect(v.cssWidth).toBe(1920);
    expect(v.cssHeight).toBe(1080);
    expect(v.scale).toBe(1.5);
  });

  it('szerokie okno dostaje pasy po bokach', () => {
    const v = fitted(2000, 720, 1);
    expect(v.cssWidth).toBe(1280);
    expect(v.cssHeight).toBe(720);
    expect(v.cssLeft).toBe(360);
    expect(v.cssTop).toBe(0);
  });

  it('wysokie okno dostaje pasy na górze i dole', () => {
    const v = fitted(1280, 1000, 1);
    expect(v.cssHeight).toBe(720);
    expect(v.cssLeft).toBe(0);
    expect(v.cssTop).toBe(140);
  });

  it('małe okno pomniejsza scenę z zachowaniem proporcji', () => {
    const v = fitted(640, 480, 1);
    expect(v.cssWidth).toBe(640);
    expect(v.cssHeight).toBe(360);
    expect(v.cssTop).toBe(60);
    expect(v.scale).toBe(0.5);
  });

  it('bufor canvasu uwzględnia DPR', () => {
    const v = fitted(1280, 720, 1.5);
    expect(v.pixelWidth).toBe(1920);
    expect(v.pixelHeight).toBe(1080);
    expect(v.cssWidth).toBe(1280);
    expect(v.scale).toBe(1.5);
  });

  it('DPR jest ograniczony do 2', () => {
    const v = fitted(1280, 720, 3);
    expect(v.pixelWidth).toBe(2560);
    expect(v.pixelHeight).toBe(1440);
    expect(v.scale).toBe(2);
  });

  it('pusty kontener i błędny DPR nie dają zerowego ani ujemnego bufora', () => {
    const v = fitted(0, 0, 0);
    expect(v.pixelWidth).toBe(1);
    expect(v.pixelHeight).toBe(1);
    expect(v.cssWidth).toBe(0);
    expect(fitted(1280, 720, Number.NaN).pixelWidth).toBe(1280);
  });
});
