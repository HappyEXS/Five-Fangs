// Tower of time: świat Immortals. Fioletowa noc ze złotem: na niebie tarcza wielkiego zegara,
// w oddali iglice, bliżej kolumnada z połamanymi kolumnami i schody, a z prawej sama wieża,
// która nie mieści się w kadrze. Gwiazdy i okna w starym złocie.
import { type BackdropSpec, disc, FLOOR, type Polygon, rect, spark, tri, vary } from './kit.ts';

/** Kolumna z głowicą i bazą; `broken` ucina ją ukośnie. */
function column(x: number, height: number, broken: boolean): Polygon[] {
  const top = FLOOR - height;
  const shaft: Polygon = broken
    ? [x - 11, FLOOR, x - 11, top + 16, x - 2, top, x + 11, top + 22, x + 11, FLOOR]
    : rect(x - 11, top, 22, height);
  const parts: Polygon[] = [shaft, rect(x - 17, FLOOR - 12, 34, 12)];
  if (!broken) parts.push(rect(x - 18, top - 10, 36, 12), rect(x - 14, top - 16, 28, 8));
  return parts;
}

export function tower(): BackdropSpec {
  // Tarcza zegara: pierścień, znaczniki godzin i dwie wskazówki.
  const cx = 600;
  const cy = 250;
  const dial: Polygon[] = [];
  for (let hour = 0; hour < 12; hour++) {
    const angle = (hour / 12) * Math.PI * 2;
    const long = hour % 3 === 0;
    const inner = long ? 150 : 164;
    const half = long ? 0.028 : 0.016;
    dial.push([
      cx + Math.cos(angle - half) * inner,
      cy + Math.sin(angle - half) * inner,
      cx + Math.cos(angle - half) * 184,
      cy + Math.sin(angle - half) * 184,
      cx + Math.cos(angle + half) * 184,
      cy + Math.sin(angle + half) * 184,
      cx + Math.cos(angle + half) * inner,
      cy + Math.sin(angle + half) * inner,
    ]);
  }
  dial.push(
    [cx - 6, cy + 8, cx + 4, cy - 132, cx + 12, cy + 4],
    [cx - 4, cy - 8, cx + 96, cy + 58, cx + 4, cy + 10],
    disc(cx, cy, 10, 12),
  );

  // Iglice w oddali: wąskie wieże ze spiczastymi hełmami.
  const spires: Polygon[] = [];
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 150 + vary(i, 60, 3);
    const height = 150 + vary(i, 150, 6);
    const width = 26 + vary(i, 18, 2);
    const top = FLOOR - height;
    spires.push(rect(x - width / 2, top, width, height));
    spires.push(tri(x - width / 2 - 5, top, x, top - 60 - vary(i, 30, 9), x + width / 2 + 5, top));
  }

  const near: Polygon[] = [];
  const gold: Polygon[] = [];
  const heights = [210, 250, 120, 270, 90, 240, 160];
  heights.forEach((height, i) => {
    near.push(...column(150 + i * 118, height, i % 3 === 2));
  });
  // Belkowanie nad najwyższymi kolumnami i schody z lewej.
  near.push(rect(120, FLOOR - 296, 300, 20));
  for (let step = 0; step < 6; step++)
    near.push(rect(0, FLOOR - 16 * (step + 1), 110 - step * 16, 16));
  // Wieża czasu: wychodzi poza górną krawędź sceny; okna w starym złocie.
  near.push(
    rect(1040, -10, 150, FLOOR + 10),
    rect(1020, FLOOR - 40, 190, 40),
    rect(1030, 150, 170, 14),
  );
  for (let row = 0; row < 5; row++) {
    gold.push([
      1104,
      70 + row * 92,
      1115,
      54 + row * 92,
      1126,
      70 + row * 92,
      1126,
      102 + row * 92,
      1104,
      102 + row * 92,
    ]);
  }
  for (let i = 0; i < 26; i++) {
    gold.push(spark(30 + i * 49 + vary(i, 30, 4), 24 + vary(i, 260, 7), 1.8 + vary(i, 2, 2)));
  }

  return {
    sky: '#372e5a',
    ground: '#3a3356',
    floorLine: '#19142c',
    layers: [
      { color: '#40366b', polygons: [disc(cx, cy, 196, 48)] },
      { color: '#372e5a', polygons: [disc(cx, cy, 140, 40)] },
      { color: '#4a3f79', polygons: dial },
      { color: '#322951', polygons: spires },
      { color: '#2b2347', polygons: near },
      { color: '#8f7d4b', polygons: gold },
    ],
  };
}
