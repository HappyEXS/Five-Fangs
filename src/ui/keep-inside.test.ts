import { describe, expect, it } from 'vitest';
import { shiftInside } from './keep-inside.ts';

const area = { left: 0, top: 0, right: 1280, bottom: 720 };
const margin = 15;

describe('shiftInside', () => {
  it('nie rusza okienka, które mieści się w obszarze z marginesem', () => {
    expect(shiftInside({ left: 100, top: 100, right: 400, bottom: 300 }, area, margin)).toEqual({
      dx: 0,
      dy: 0,
    });
  });

  it('wsuwa okienko wystające z lewej i z góry', () => {
    expect(shiftInside({ left: -80, top: -40, right: 220, bottom: 260 }, area, margin)).toEqual({
      dx: 95,
      dy: 55,
    });
  });

  it('wsuwa okienko wystające z prawej i z dołu', () => {
    expect(shiftInside({ left: 1100, top: 600, right: 1400, bottom: 800 }, area, margin)).toEqual({
      dx: -135,
      dy: -95,
    });
  });

  it('okienko większe niż obszar wyrównuje do lewej i górnej krawędzi', () => {
    expect(shiftInside({ left: 200, top: 300, right: 1700, bottom: 1300 }, area, margin)).toEqual({
      dx: -185,
      dy: -285,
    });
    expect(shiftInside({ left: -500, top: -10, right: 1000, bottom: 990 }, area, margin)).toEqual({
      dx: 515,
      dy: 25,
    });
  });

  it('działa dla obszaru przesuniętego w oknie (scena z marginesami po bokach)', () => {
    const stage = { left: 70, top: 0, right: 1186, bottom: 628 };
    expect(shiftInside({ left: 40, top: 20, right: 300, bottom: 200 }, stage, 10)).toEqual({
      dx: 40,
      dy: 0,
    });
  });
});
