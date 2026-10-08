// Living swamps: świat Roślin. Mętna zieleń bagien: blady księżyc we mgle, drzewa o płaskich
// koronach na cienkich pniach, zwisające pnącza, trzciny i pałki przy ziemi, świetliki.
import {
  type BackdropSpec,
  bow,
  disc,
  FLOOR,
  oval,
  type Polygon,
  rect,
  spark,
  vary,
} from './kit.ts';

/** Drzewo bagienne: pień rozszerzony u dołu i płaska, rozłożysta korona. */
function mangrove(x: number, height: number, spread: number): Polygon[] {
  const top = FLOOR - height;
  return [
    [x - 14, FLOOR, x - 5, top + 40, x - 4, top, x + 4, top, x + 5, top + 40, x + 14, FLOOR],
    oval(x, top, spread, 34),
    oval(x - spread * 0.55, top + 14, spread * 0.5, 22),
    oval(x + spread * 0.6, top + 10, spread * 0.45, 20),
  ];
}

export function swamps(): BackdropSpec {
  const far: Polygon[] = [];
  for (let i = 0; i < 9; i++) {
    far.push(...mangrove(40 + i * 152 + vary(i, 40, 1), 170 + vary(i, 90, 4), 70 + vary(i, 30, 7)));
  }

  const near: Polygon[] = [];
  const fireflies: Polygon[] = [];
  // Pnącza zwisają znad górnej krawędzi sceny; co drugie kończy się liściem.
  for (let i = 0; i < 14; i++) {
    const x = 30 + i * 92 + vary(i, 50, 2);
    const length = 90 + vary(i, 170, 6);
    near.push(bow(x, -10, x + 16 - vary(i, 32, 3), length * 0.5, x + 6, length, 5, 0.3));
    if (i % 2 === 0) near.push(oval(x + 6, length + 6, 7, 11));
  }
  // Trzciny i pałki wodne wzdłuż ziemi, w kępach.
  for (let i = 0; i < 46; i++) {
    const x = 6 + i * 28 + vary(i, 14, 9);
    const height = 34 + vary(i, 60, 11);
    near.push([x - 2, FLOOR, x + 6 - vary(i, 10, 4), FLOOR - height, x + 2, FLOOR]);
    if (i % 3 === 0) near.push(oval(x + 3, FLOOR - height - 6, 4, 11));
  }
  // Wielkie grzyby przy krawędziach.
  for (const [x, height, cap] of [
    [70, 150, 62],
    [1210, 190, 74],
    [1120, 96, 44],
  ] as const) {
    near.push(rect(x - 7, FLOOR - height, 14, height));
    near.push([
      x - cap,
      FLOOR - height + 8,
      x - cap * 0.6,
      FLOOR - height - 26,
      x,
      FLOOR - height - 38,
      x + cap * 0.6,
      FLOOR - height - 26,
      x + cap,
      FLOOR - height + 8,
    ]);
  }
  for (let i = 0; i < 16; i++) {
    fireflies.push(spark(60 + i * 78 + vary(i, 40, 5), 330 + vary(i, 190, 8), 2.5 + vary(i, 2, 1)));
  }

  return {
    sky: '#2f4c48',
    ground: '#263e30',
    floorLine: '#121d18',
    layers: [
      { color: '#365650', polygons: [disc(930, 210, 96)] },
      { color: '#2a4541', polygons: far },
      { color: '#233b37', polygons: near },
      { color: '#b4cc68', polygons: fireflies },
    ],
  };
}
