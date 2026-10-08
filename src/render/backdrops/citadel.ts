// Cytadela Akronix: siedziba najeźdźców, ostatni świat. Niebo w kolorze wina, wielki czerwony
// księżyc, ostre szczyty w oddali, mur zjeżony kolcami, baszty z rogami i brama z kłami zamiast
// kraty. Proporce w czerwieni szczepu, przy murze żar ognisk.
import {
  type BackdropSpec,
  disc,
  FLOOR,
  type Polygon,
  rect,
  ridge,
  spark,
  tri,
  vary,
} from './kit.ts';

/** Mur zjeżony trójkątnymi kolcami zamiast blanek. */
function spikedWall(x0: number, x1: number, top: number, step: number): Polygon {
  const points: number[] = [x0, FLOOR, x0, top];
  for (let x = x0; x < x1; x += step) {
    const next = Math.min(x + step, x1);
    points.push((x + next) / 2, top - 20 - vary(Math.round(x), 10), next, top);
  }
  points.push(x1, FLOOR);
  return points;
}

/** Baszta z dwoma rogami na szczycie i proporcem zwisającym z boku. */
function hornedTower(x: number, width: number, top: number): [Polygon[], Polygon] {
  const right = x + width;
  return [
    [
      rect(x, top, width, FLOOR - top),
      [x - 8, top + 6, x + 6, top - 52, x + 22, top + 6],
      [right - 22, top + 6, right - 6, top - 52, right + 8, top + 6],
      tri(x + width / 2 - 14, top + 4, x + width / 2, top - 26, x + width / 2 + 14, top + 4),
    ],
    // Proporzec z wyciętym „jaskółczym ogonem”.
    [
      x + width / 2 - 13,
      top + 34,
      x + width / 2 + 13,
      top + 34,
      x + width / 2 + 13,
      top + 118,
      x + width / 2,
      top + 102,
      x + width / 2 - 13,
      top + 118,
    ],
  ];
}

export function citadel(): BackdropSpec {
  const peaks = ridge([
    0, 430, 70, 330, 120, 400, 210, 250, 270, 380, 360, 300, 430, 410, 540, 290, 600, 390, 700, 320,
    780, 420, 880, 270, 950, 400, 1050, 310, 1130, 410, 1220, 300, 1280, 380,
  ]);

  const walls: Polygon[] = [spikedWall(40, 1240, 430, 34)];
  const banners: Polygon[] = [];
  for (const [x, width, top] of [
    [110, 110, 300],
    [420, 86, 350],
    [774, 86, 350],
    [1060, 130, 270],
  ] as const) {
    const [stone, banner] = hornedTower(x, width, top);
    walls.push(...stone);
    banners.push(banner);
  }
  // Nadbramie między środkowymi basztami.
  walls.push(spikedWall(506, 774, 388, 30));

  // Brama: ciemna paszcza z kłami wiszącymi z góry i sterczącymi z dołu.
  const maw: Polygon[] = [[560, FLOOR, 560, 470, 600, 440, 680, 440, 720, 470, 720, FLOOR]];
  const fangs: Polygon[] = [];
  for (let i = 0; i < 5; i++) {
    const x = 576 + i * 32;
    fangs.push(tri(x - 11, 444, x, 500 + vary(i, 14), x + 11, 444));
    if (i < 4) fangs.push(tri(x + 5, FLOOR, x + 16, FLOOR - 38 - vary(i, 10, 3), x + 27, FLOOR));
  }

  const embers: Polygon[] = [];
  for (const x of [250, 370, 890, 1010]) {
    embers.push(tri(x - 9, FLOOR - 26, x, FLOOR - 52, x + 9, FLOOR - 26), spark(x, FLOOR - 62, 3));
    walls.push(rect(x - 12, FLOOR - 28, 24, 6), rect(x - 3, FLOOR - 22, 6, 22));
  }
  for (let i = 0; i < 12; i++) {
    embers.push(spark(80 + i * 104 + vary(i, 50, 2), 200 + vary(i, 180, 5), 1.8 + vary(i, 2, 4)));
  }

  return {
    sky: '#5a2c3b',
    ground: '#2c191f',
    floorLine: '#11080b',
    layers: [
      { color: '#7a3743', polygons: [disc(330, 210, 132, 40)] },
      { color: '#4f2635', polygons: [peaks] },
      { color: '#42202d', polygons: walls },
      { color: '#24111a', polygons: maw },
      { color: '#6b5450', polygons: fangs },
      { color: '#7d2f2a', polygons: banners },
      { color: '#c8672f', polygons: embers },
    ],
  };
}
