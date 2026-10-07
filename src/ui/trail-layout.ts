// Rozmieszczenie kafli poziomów na szlaku mapy. Czysta geometria w procentach pola mapy:
// każdy świat ma własny kształt szlaku, żeby mapy różniły się nie tylko tłem.

/**
 * Kształty kafli w polu 100×80: nieregularne wielokąty, jakby wycięte nożyczkami. Ostatni
 * poziom świata (boss) ma własny kształt z zębatą górą.
 */
const TILE_SHAPES = [
  '6,10 92,4 97,66 60,76 8,71 2,40',
  '4,6 58,2 96,11 93,70 40,77 6,65',
  '8,4 93,9 98,44 89,73 11,76 3,30',
  '3,13 50,4 95,7 96,69 53,77 5,71',
];
const BOSS_SHAPE = '4,22 19,6 33,20 50,3 67,20 81,6 96,22 95,70 50,78 5,70';

/**
 * Wysokość kafla na szlaku (procent pola mapy) dla postępu `at` od 0 do 1 i numeru kafla.
 * Kolejność jak światy w treści gry: zygzak przez dziedzińce zamku, taśma fabryki w dwóch
 * poziomach, meander bagien, stok wulkanu, schody wieży i zejście do cytadeli z tronem na górze.
 */
const TRAILS: readonly ((at: number, index: number) => number)[] = [
  (_at, index) => (index % 2 === 0 ? 66 : 30),
  (_at, index) => (index % 4 < 2 ? 66 : 32),
  (at) => 48 + 20 * Math.sin(at * Math.PI * 2),
  (at) => 68 - 40 * Math.sin(at * Math.PI),
  (at) => 72 - 46 * at,
  (at) => 30 + 40 * (1 - Math.abs(2 * at - 1)),
];

export interface TileSpot {
  /** Środek kafla w procentach pola mapy. */
  readonly x: number;
  readonly y: number;
  /** Obrót w stopniach. */
  readonly tilt: number;
  readonly shape: string;
}

/**
 * Miejsca kafli jednego świata: szlak idzie od lewej do prawej po kształcie swojego świata,
 * a każdy kafel jest trochę przesunięty i obrócony. Rozrzut wynika z numeru poziomu i świata,
 * więc mapa wygląda tak samo przy każdym otwarciu.
 */
export function tileSpots(count: number, world: number): TileSpot[] {
  const trail = TRAILS[world % TRAILS.length] ?? (() => 48);
  return Array.from({ length: count }, (_, i) => {
    const at = count === 1 ? 0.5 : i / (count - 1);
    const wobble = ((i * 37 + world * 17 + 5) % 11) - 5;
    return {
      x: 8 + 84 * at,
      y: trail(at, i) + wobble * 1.2,
      tilt: ((i * 53 + world * 29 + 3) % 9) - 4,
      shape: i === count - 1 ? BOSS_SHAPE : (TILE_SHAPES[(i + world) % TILE_SHAPES.length] ?? ''),
    };
  });
}
