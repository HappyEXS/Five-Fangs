import { describe, expect, it } from 'vitest';
import { BACKDROP_IDS } from '../../content/schema-progression.ts';
import { GROUND_Y } from '../camera.ts';
import { LOGICAL_WIDTH } from '../viewport.ts';
import { BACKDROP_SPECS, DEFAULT_BACKDROP } from './index.ts';
import { battlement, bow, disc, gear, rect, ridge, steps, vary } from './kit.ts';

/** Jasność względna koloru #rrggbb według WCAG. */
function luminance(color: string): number {
  const channel = (offset: number): number => {
    const value = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

/** Kolor napisów interfejsu leżących wprost na scenie (--paper w ui/styles/base.css). */
const PAPER = '#efe6cf';
const HEX = /^#[0-9a-f]{6}$/;

describe('tła światów', () => {
  it('każde tło z treści gry ma swój rysunek', () => {
    expect(Object.keys(BACKDROP_SPECS).sort()).toEqual([...BACKDROP_IDS].sort());
    expect(BACKDROP_IDS).toContain(DEFAULT_BACKDROP);
  });

  for (const id of BACKDROP_IDS) {
    describe(id, () => {
      const spec = BACKDROP_SPECS[id]();

      it('ma kolory w zapisie #rrggbb i co najmniej dwie warstwy sylwetek', () => {
        expect(spec.sky).toMatch(HEX);
        expect(spec.ground).toMatch(HEX);
        expect(spec.floorLine).toMatch(HEX);
        expect(spec.layers.length).toBeGreaterThanOrEqual(2);
        for (const layer of spec.layers) {
          expect(layer.color).toMatch(HEX);
          expect(layer.polygons.length).toBeGreaterThan(0);
        }
      });

      it('wielokąty mają co najmniej trzy punkty o skończonych współrzędnych', () => {
        for (const layer of spec.layers) {
          for (const polygon of layer.polygons) {
            expect(polygon.length % 2).toBe(0);
            expect(polygon.length).toBeGreaterThanOrEqual(6);
            expect(polygon.every(Number.isFinite)).toBe(true);
          }
        }
      });

      it('napisy interfejsu są czytelne na niebie i na ziemi', () => {
        // Nazwa świata, sakiewka i podpisy postaci leżą wprost na tle, bez własnej podkładki.
        expect(contrast(PAPER, spec.sky)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(PAPER, spec.ground)).toBeGreaterThanOrEqual(4.5);
      });

      it('duże sylwetki są stonowane: postacie i kafle mapy mają być od nich wyraźniejsze', () => {
        // Akcenty (okna, świetliki, iskry) mogą być jasne, bo są drobne; warstwy o dużej
        // powierzchni muszą trzymać się blisko koloru nieba.
        for (const layer of spec.layers) {
          const area = layer.polygons.reduce((sum, polygon) => {
            let twice = 0;
            for (let i = 0; i < polygon.length; i += 2) {
              const j = (i + 2) % polygon.length;
              twice +=
                (polygon[i] ?? 0) * (polygon[j + 1] ?? 0) -
                (polygon[j] ?? 0) * (polygon[i + 1] ?? 0);
            }
            return sum + Math.abs(twice) / 2;
          }, 0);
          if (area > 40_000) expect(contrast(layer.color, spec.sky), layer.color).toBeLessThan(1.6);
        }
      });

      it('jest powtarzalne', () => {
        expect(BACKDROP_SPECS[id]()).toEqual(spec);
      });
    });
  }
});

describe('przybory teł', () => {
  it('prostokąt, koło i grzbiet', () => {
    expect(rect(10, 20, 30, 40)).toEqual([10, 20, 40, 20, 40, 60, 10, 60]);
    const circle = disc(100, 100, 50, 4);
    expect(circle.map((value) => Math.round(value))).toEqual([
      150, 100, 100, 150, 50, 100, 100, 50,
    ]);
    // Grzbiet domyka linia podłogi od lewej do prawej krawędzi sceny.
    expect(ridge([300, 400])).toEqual([0, GROUND_Y, 300, 400, LOGICAL_WIDTH, GROUND_Y]);
  });

  it('grzbiet o stałym kroku sięga prawej krawędzi sceny', () => {
    const hills = steps(160, () => 100);
    const xs = hills.filter((_, index) => index % 2 === 0);
    expect(Math.max(...xs.slice(1, -1))).toBeGreaterThanOrEqual(LOGICAL_WIDTH);
    expect(hills[3]).toBe(GROUND_Y - 100);
  });

  it('mur z blankami zaczyna i kończy się na podłodze, a zęby są na przemian w górze i w dole', () => {
    const wall = battlement(0, 40, 300, 10, 8);
    expect(wall.slice(0, 4)).toEqual([0, GROUND_Y, 0, 300]);
    expect(wall.slice(-2)).toEqual([40, GROUND_Y]);
    const tops = wall.slice(4, -2).filter((_, index) => index % 2 === 1);
    expect(tops).toEqual([300, 300, 308, 308, 300, 300, 308, 308]);
  });

  it('koło zębate ma cztery punkty na ząb, a łuk zwęża się ku końcowi', () => {
    expect(gear(0, 0, 100, 12, 20)).toHaveLength(12 * 4 * 2);
    const rib = bow(0, 0, 50, -80, 100, 0, 20, 0.1);
    // Obwód: jedenaście punktów lewego brzegu i jedenaście prawego.
    expect(rib).toHaveLength(22 * 2);
    const width = (a: number, b: number) =>
      Math.hypot((rib[a] ?? 0) - (rib[b] ?? 0), (rib[a + 1] ?? 0) - (rib[b + 1] ?? 0));
    expect(width(0, 42)).toBeCloseTo(20);
    expect(width(20, 22)).toBeCloseTo(2);
  });

  it('„losowość” jest stała i mieści się w zakresie', () => {
    for (let i = 0; i < 50; i++) {
      expect(vary(i, 7, 3)).toBe(vary(i, 7, 3));
      expect(vary(i, 7, 3)).toBeGreaterThanOrEqual(0);
      expect(vary(i, 7, 3)).toBeLessThan(7);
    }
  });
});
