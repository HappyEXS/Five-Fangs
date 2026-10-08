// Mechanus town: świat Robotów. Stalowy smog nad miastem fabryk: hale o zębatych dachach,
// kominy z dymem, wielkie koła zębate wkopane w ziemię, rurociąg i żuraw; w oknach zimne światło.
import { type BackdropSpec, FLOOR, gear, oval, type Polygon, rect, spark, vary } from './kit.ts';

export function mechanus(): BackdropSpec {
  const skyline: Polygon[] = [];
  const smoke: Polygon[] = [];
  const lights: Polygon[] = [];
  // Hale i bloki: szerokość i wysokość z numeru budynku, co trzeci ma dach w zęby piły.
  let x = -20;
  for (let i = 0; x < 1300; i++) {
    const width = 70 + vary(i, 70, 2);
    const height = 110 + vary(i, 120, 5);
    const top = FLOOR - height;
    if (i % 3 === 1) {
      const teeth = 3;
      const tooth = width / teeth;
      const roof: number[] = [x, FLOOR, x, top];
      for (let t = 0; t < teeth; t++) roof.push(x + t * tooth, top - 22, x + (t + 1) * tooth, top);
      roof.push(x + width, FLOOR);
      skyline.push(roof);
    } else {
      skyline.push(rect(x, top, width, height));
    }
    if (i % 2 === 0) {
      // Komin i trzy kłęby dymu znoszone w prawo.
      const stack = x + width * 0.3;
      skyline.push(rect(stack, top - 70, 14, 72));
      for (let puff = 0; puff < 3; puff++) {
        smoke.push(
          oval(stack + 12 + puff * 22, top - 86 - puff * 20, 16 + puff * 6, 10 + puff * 3),
        );
      }
    }
    for (let row = 0; row < 2; row++) {
      if (vary(i, 3, row) !== 0) lights.push(rect(x + 14 + row * 22, top + 26 + row * 30, 7, 7));
    }
    x += width + 6;
  }

  const machines: Polygon[] = [
    // Koła zębate wkopane w ziemię po obu stronach sceny.
    gear(170, FLOOR + 10, 118, 12, 26),
    gear(1090, FLOOR + 30, 150, 14, 28),
    gear(1232, FLOOR - 70, 44, 8, 14),
    // Rurociąg na podporach przez środek.
    rect(300, 462, 620, 16),
    ...[340, 470, 600, 730, 860].map((px) => rect(px, 478, 10, FLOOR - 478)),
    ...[300, 608, 904].map((px) => rect(px - 4, 456, 12, 28)),
    // Żuraw: maszt, wysięgnik i lina z hakiem.
    rect(742, 300, 16, FLOOR - 300),
    [750, 300, 930, 268, 934, 280, 756, 318],
    [700, 296, 750, 300, 752, 314, 700, 308],
    rect(900, 276, 3, 96),
    [892, 372, 912, 372, 908, 388, 896, 388],
  ];
  lights.push(spark(750, 292, 5), spark(170, 430, 4), spark(1090, 400, 4));

  return {
    sky: '#3c546d',
    ground: '#2c343d',
    floorLine: '#141a21',
    layers: [
      { color: '#445d77', polygons: smoke },
      { color: '#354b62', polygons: skyline },
      { color: '#2e4357', polygons: machines },
      { color: '#5a93a6', polygons: lights },
    ],
  };
}
