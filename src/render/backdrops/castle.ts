// Zamek: świat Mieczników i Łuczników. Zmierzch nad murami: wzgórza w oddali, kurtyna z blankami,
// baszty ze spiczastymi dachami i proporcami, brama pośrodku, w oknach światło.
import {
  type BackdropSpec,
  battlement,
  FLOOR,
  type Polygon,
  rect,
  steps,
  tri,
  vary,
} from './kit.ts';

/** Baszta: mur z blankami, daszek i proporzec na szczycie. Zwraca [mur i dach, proporzec]. */
function tower(x: number, width: number, top: number, roof: number): [Polygon[], Polygon[]] {
  const mid = x + width / 2;
  const peak = top - roof;
  return [
    [battlement(x, x + width, top, 12, 9), tri(x + 6, top + 1, mid, peak, x + width - 6, top + 1)],
    [
      rect(mid - 1, peak - 26, 2, 28),
      tri(mid + 1, peak - 26, mid + 23, peak - 19, mid + 1, peak - 12),
    ],
  ];
}

export function castle(): BackdropSpec {
  const walls: Polygon[] = [battlement(96, 1190, 438, 16, 11)];
  const flags: Polygon[] = [];
  const windows: Polygon[] = [];
  for (const [x, width, top, roof] of [
    [70, 104, 330, 78],
    [330, 76, 372, 56],
    [546, 84, 352, 64],
    [690, 84, 352, 64],
    [900, 72, 380, 52],
    [1070, 150, 286, 96],
  ] as const) {
    const [stone, flag] = tower(x, width, top, roof);
    walls.push(...stone);
    flags.push(...flag);
    // Wąskie okna strzelnicze, po dwa na basztę.
    for (let row = 0; row < 2; row++) {
      windows.push(rect(x + width / 2 - 4 + (row === 0 ? -12 : 12), top + 34 + row * 46, 7, 16));
    }
  }
  // Nadbramie między dwiema środkowymi basztami i ciemny otwór bramy.
  walls.push(battlement(630, 690, 392, 12, 9));
  const gate: Polygon[] = [[636, FLOOR, 636, 478, 648, 458, 672, 458, 684, 478, 684, FLOOR]];
  return {
    sky: '#3f4c80',
    ground: '#2c5446',
    floorLine: '#241f3d',
    layers: [
      { color: '#3a4679', polygons: [steps(160, (i) => 96 + vary(i, 64, 1))] },
      { color: '#343f70', polygons: walls },
      { color: '#2a3360', polygons: gate },
      { color: '#8f8254', polygons: windows },
      { color: '#9a7f3c', polygons: flags },
    ],
  };
}
