// Jungle of doom: świat Bestii. Duszny zmierzch: nisko wiszące słońce, dymiący wulkan nad
// poszarpanymi górami, palmy i liany, a między nimi żebra olbrzyma sterczące z ziemi.
import { type BackdropSpec, bow, disc, FLOOR, oval, type Polygon, ridge, vary } from './kit.ts';

/** Palma: wygięty pień i wachlarz liści opadających na boki. */
function palm(x: number, height: number, lean: number): Polygon[] {
  const topX = x + lean;
  const topY = FLOOR - height;
  const parts: Polygon[] = [
    bow(x, FLOOR, x + lean * 0.2, FLOOR - height * 0.6, topX, topY, 16, 0.5),
  ];
  for (const [dx, dy] of [
    [-78, 26],
    [-58, -22],
    [-14, -46],
    [36, -34],
    [74, 4],
    [60, 44],
    [-44, 56],
  ] as const) {
    parts.push(bow(topX, topY, topX + dx * 0.6, topY + dy - 22, topX + dx, topY + dy, 20, 0.1));
  }
  return parts;
}

export function jungle(): BackdropSpec {
  // Wulkan z wyszczerbionym kraterem i łańcuch gór.
  const mountains: Polygon[] = [
    ridge([
      0, 470, 90, 430, 170, 452, 270, 330, 330, 262, 352, 276, 372, 258, 396, 274, 420, 262, 500,
      350, 590, 420, 690, 384, 790, 436, 900, 372, 1010, 418, 1110, 356, 1200, 410, 1280, 380,
    ]),
  ];
  const smoke: Polygon[] = [0, 1, 2, 3].map((i) =>
    oval(372 + i * 30, 232 - i * 34, 30 + i * 12, 18 + i * 6),
  );

  const canopy: Polygon[] = [
    ...palm(110, 300, 40),
    ...palm(470, 230, -30),
    ...palm(820, 270, 36),
    ...palm(1180, 320, -44),
  ];
  // Liany znad górnej krawędzi sceny.
  for (let i = 0; i < 10; i++) {
    const x = 60 + i * 128 + vary(i, 60, 3);
    const drop = 100 + vary(i, 150, 5);
    canopy.push(bow(x, -10, x + 60, drop, x + 130, -10, 6));
  }
  // Niskie zarośla: wachlarze szerokich liści przy ziemi.
  for (let i = 0; i < 20; i++) {
    const x = 20 + i * 66 + vary(i, 30, 7);
    const h = 40 + vary(i, 50, 2);
    canopy.push([
      x - 26,
      FLOOR,
      x - 34,
      FLOOR - h * 0.7,
      x - 8,
      FLOOR - h * 0.3,
      x,
      FLOOR - h,
      x + 10,
      FLOOR - h * 0.3,
      x + 36,
      FLOOR - h * 0.6,
      x + 26,
      FLOOR,
    ]);
  }

  // Żebra olbrzyma: łuki kości wyrastające z ziemi, coraz niższe ku prawej.
  const ribs: Polygon[] = [0, 1, 2, 3, 4].map((i) => {
    const x = 560 + i * 62;
    const height = 220 - i * 26;
    return bow(x, FLOOR, x - 70, FLOOR - height * 0.9, x + 40, FLOOR - height, 15 - i, 0.25);
  });

  return {
    sky: '#5a3d3d',
    ground: '#3a3122',
    floorLine: '#1a140f',
    layers: [
      { color: '#74483a', polygons: [disc(960, 400, 128, 36)] },
      { color: '#654646', polygons: smoke },
      { color: '#4d3537', polygons: mountains },
      { color: '#6f5d4c', polygons: ribs },
      { color: '#3d3329', polygons: canopy },
    ],
  };
}
