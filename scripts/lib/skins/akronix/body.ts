// Wspólne części postaci Akronix na szkielecie humanoid: chude kończyny w owijaczach, tułów
// z peleryną i głowa z przepaską na oczach. Rozmieszczenie stawów opisuje limbs.ts.
import { intersect, type Shape, union } from '../../raster.ts';
import { MAW, type PartCanvas, type Point, partCanvas, RAG_HARD } from '../kit.ts';
import { BAND, CLOTH, EMBER, HAIR, LEATHER, SKIN, type Tone } from './palette.ts';

// ---------------------------------------------------------------------------------------------
// Kończyny
// ---------------------------------------------------------------------------------------------

/** Udo w owijaczach. `girth` 1 to chuda postać z górnego rzędu szkicu, więcej to Axin. */
export function wrapThigh(tone: Tone, girth = 1): PartCanvas {
  const c = partCanvas(-8, -6, 8, 16, 71);
  const inside = c.form(c.horn(0, 0, 0, 10.6, 3 * girth, 2.3 * girth), tone, { rag: 0.35 });
  for (const y of [2.4, 6.2]) {
    c.fill(intersect(inside, c.line(-5, y, 5, y + 1.8, 0.28)), tone.dark, 0.7);
  }
  return c.finish();
}

/** Goleń z butem; ziemia leży ok. 14,5 pod kolanem. `heavy` to okuty but Axina. */
export function wrapShin(tone: Tone, girth = 1, heavy = false): PartCanvas {
  const c = partCanvas(-8, -5, 12, 18, 72);
  c.form(c.horn(0, 0, 0, 10.2, 2.3 * girth, 1.8 * girth), tone, { rag: 0.35 });
  const boot = union(
    c.box(0, 9.4, 2.3 * girth + (heavy ? 0.6 : 0), 3, 0.8),
    c.oval(2.3, 12.6, heavy ? 5.2 : 4.2, heavy ? 2.3 : 1.9),
  );
  const inside = c.form(boot, LEATHER, { rag: RAG_HARD });
  c.fill(intersect(inside, c.line(-4, 7.6, 4, 7.6, 0.35)), LEATHER.dark, 0.8);
  if (heavy) c.fill(intersect(inside, c.oval(5.6, 13, 2, 1.6)), '#676d73', 0.9);
  return c.finish();
}

/** Ramię: od barku do łokcia. */
export function wrapUpper(tone: Tone, girth = 1): PartCanvas {
  const c = partCanvas(-7, -5, 7, 14, 73);
  c.form(c.horn(0, 0, 0, 9.6, 2.5 * girth, 2 * girth), tone, { rag: 0.35 });
  return c.finish();
}

/** Przedramię z dłonią; broń doczepia się w punkcie (0, 9). `cuff` to karwasz na nadgarstku. */
export function wrapFore(tone: Tone, hand: Tone, girth = 1, cuff: Tone | null = null): PartCanvas {
  const c = partCanvas(-7, -5, 7, 15, 74);
  c.form(c.horn(0, 0, 0, 8.2, 2.1 * girth, 1.7 * girth), tone, { rag: 0.35 });
  if (cuff !== null) {
    c.form(c.box(0, 6.2, 2.1 * girth + 0.5, 1.5, 0.5), cuff, { rag: RAG_HARD, shadow: 0.5 });
  }
  c.form(c.dot(0, 9.3, 1.9 * girth), hand, { rag: RAG_HARD, shadow: 0.6 });
  return c.finish();
}

// ---------------------------------------------------------------------------------------------
// Tułów
// ---------------------------------------------------------------------------------------------

export type Cloak = 'none' | 'short' | 'long' | 'grand';

export interface TorsoOptions {
  readonly cloak: Cloak;
  /** Czerwona szarfa w pasie z końcem zwisającym z przodu. */
  readonly sash?: boolean;
  /** Skórzany pas przez pierś. */
  readonly strap?: boolean;
  /** Granice płótna, gdy dodatki wychodzą poza zwykłe. */
  readonly bounds?: readonly [number, number, number, number];
  readonly salt: number;
  /** Dodatki rysowane za tułowiem (kołczan, drzewce) i na nim (naramienniki, klamra). */
  readonly behind?: (c: PartCanvas) => void;
  readonly over?: (c: PartCanvas, inside: Shape) => void;
}

/** Brzeg peleryny: od barków w dół i do tyłu, z wystrzępionym dołem. */
function cloakShape(c: PartCanvas, cloak: Exclude<Cloak, 'none'>): Shape {
  const hems: Record<Exclude<Cloak, 'none'>, readonly Point[]> = {
    short: [
      [-8.6, -6],
      [-7, -8.2],
      [-5.6, -5.4],
      [-3.6, -7.6],
      [-1.6, -5.8],
    ],
    long: [
      [-11.4, 5.4],
      [-9.6, 2.6],
      [-8, 6],
      [-6, 3],
      [-4.2, 5.6],
      [-2, 2],
    ],
    grand: [
      [-15.6, 9.6],
      [-13.4, 6],
      [-11.4, 10.4],
      [-9, 6.4],
      [-6.8, 10],
      [-4.4, 6],
      [-2, 8.6],
      [0.4, 4],
    ],
  };
  return c.poly([[3, -22.4], [-3.4, -22.8], ...hems[cloak], [2.6, -14]]);
}

/**
 * Chudy tułów w ciemnym suknie (pivot w biodrach, szyja 23 jednostki wyżej, przód po prawej).
 * Zwraca płótno po postarzeniu.
 */
export function slimTorso(options: TorsoOptions): PartCanvas {
  const [left, top, right, bottom] = options.bounds ?? [-17, -27, 10, 13];
  const c = partCanvas(left, top, right, bottom, options.salt);
  options.behind?.(c);
  if (options.cloak !== 'none') {
    const cape = c.form(cloakShape(c, options.cloak), CLOTH, { rag: 0.7 });
    c.patches(cape, CLOTH.light, 0.12, 2.6, 0.5);
    // Fałdy: ciemne smugi biegnące od barku do brzegu.
    for (const x of [-4.4, -7.4]) {
      c.fill(intersect(cape, c.line(x * 0.4, -20, x, 8, 0.3)), CLOTH.dark, 0.6);
    }
  }
  const trunk = union(c.horn(0, -20.4, 0, -1.4, 4.4, 3.4), c.box(0, -0.6, 3.5, 2.2, 1));
  const inside = c.form(trunk, CLOTH, { rag: 0.4, rim: 0.35 });
  c.patches(inside, CLOTH.light, 0.1, 2, 0.5);
  if (options.strap) {
    c.fill(intersect(inside, c.line(-4.6, -19.4, 4.2, -7.4, 0.9)), LEATHER.dark);
    c.fill(intersect(inside, c.line(-4.6, -19.4, 4.2, -7.4, 0.5)), LEATHER.main);
  }
  if (options.sash) {
    c.form(c.box(0.2, -4.4, 4.1, 1.4, 0.5), BAND, { rag: RAG_HARD, shadow: 0.5 });
    c.form(c.horn(3, -3.6, 4.6, 3.4, 1.3, 0.5), BAND, { rag: 0.4, shadow: 0.5 });
  }
  options.over?.(c, inside);
  return c.finish();
}

// ---------------------------------------------------------------------------------------------
// Głowa
// ---------------------------------------------------------------------------------------------

export type Hair = 'none' | 'topknot' | 'swept' | 'spikes' | 'crest' | 'shag';

export interface HeadOptions {
  readonly hair: Hair;
  /** Przepaska na oczach z węzłem z tyłu głowy; Axiny mają zamiast niej włosy na oczach. */
  readonly band: boolean;
  /** Usta: zaciśnięta kreska albo wrzask. */
  readonly mouth: 'line' | 'shout';
  /** Ściągnięte, gniewne brwi nad włosami (Axin 2 i 3). */
  readonly brows?: boolean;
  readonly salt: number;
}

function hairBehind(c: PartCanvas, hair: Hair): void {
  if (hair === 'topknot') {
    c.form(union(c.dot(-3.4, -17.2, 2.3), c.horn(-4.4, -18.4, -8, -21, 1.2, 0.3)), HAIR, {
      rag: 0.5,
    });
  } else if (hair === 'swept') {
    // Długie włosy zaczesane do tyłu, falujące nad karkiem.
    c.form(
      union(
        c.arc([4, -15.4], [-3, -19.6], [-10.4, -13.6], 2.6, 1.2),
        c.arc([-5, -14], [-10.6, -11], [-9.6, -5.4], 2.4, 0.6),
        c.arc([-3, -15], [-12.6, -15.4], [-12.4, -9], 1.6, 0.4),
      ),
      HAIR,
      { rag: 0.6 },
    );
  } else if (hair === 'spikes') {
    const spikes: Shape[] = [];
    for (const [x, y] of [
      [4.6, -21.4],
      [1.4, -23.4],
      [-2.4, -23],
      [-6, -20.8],
      [-9, -17],
      [-10.4, -12.4],
    ] as const) {
      spikes.push(c.horn(x * 0.35, -12, x, y, 2.6, 0.3));
    }
    c.form(union(...spikes), HAIR, { rag: 0.5 });
  } else if (hair === 'crest') {
    // Wysoki grzebień włosów generała, odchylony do tyłu.
    c.form(
      union(
        c.arc([3.4, -14.6], [2, -27], [-5, -31], 3.4, 0.5),
        c.arc([0, -15], [-4, -24], [-9.6, -26.4], 3.2, 0.5),
        c.arc([-3, -14], [-8.6, -19], [-12, -19.6], 2.8, 0.4),
        c.arc([-5, -12], [-10, -12.6], [-12.4, -9], 2.2, 0.4),
      ),
      HAIR,
      { rag: 0.6 },
    );
  } else if (hair === 'shag') {
    // Kudły Axina: opadają na kark z tyłu głowy.
    c.form(
      union(
        c.oval(-1.4, -11.4, 9, 7.4),
        c.horn(-7, -8, -10.6, -0.6, 2.6, 0.4),
        c.horn(-4.6, -6, -7.4, 1, 2.2, 0.4),
      ),
      HAIR,
      { rag: 0.8 },
    );
  }
}

/** Głowa (pivot na szyi): blada czaszka, przepaska na oczach albo kudły, usta. */
export function bandHead(options: HeadOptions): PartCanvas {
  const tall = options.hair === 'crest';
  const c = partCanvas(-15, tall ? -35 : -27, 13, 6, options.salt);
  if (options.band) {
    // Końce przepaski powiewają za głową.
    c.form(
      union(c.horn(-6, -10.4, -12.4, -6.4, 1.1, 0.35), c.horn(-6, -9.8, -11, -2.6, 1, 0.3)),
      BAND,
      { rag: 0.4, shadow: 0.5 },
    );
  }
  hairBehind(c, options.hair);
  c.form(c.box(0.2, -1, 1.7, 2.4, 0.6), SKIN, { rag: RAG_HARD, shadow: 0.8 });
  const skull = c.oval(0.6, -8.6, 6.8, 7.4);
  const inside = c.form(skull, SKIN, { rag: 0.3 });
  c.patches(inside, SKIN.shade, 0.22, 2.2, 0.75);
  // Zapadnięty policzek i cień pod kością policzkową.
  c.fill(intersect(inside, c.arc([1.6, -7], [3.4, -4.4], [6.2, -6.4], 0.35, 0.25)), SKIN.dark, 0.5);

  if (options.band) {
    const band = c.form(c.box(0.9, -10.4, 7.3, 1.6, 0.5), BAND, { rag: RAG_HARD, shadow: 0.5 });
    c.patches(band, BAND.shade, 0.3, 1.6, 0.8);
    c.form(c.dot(-6.4, -10.2, 1.5), BAND, { rag: RAG_HARD, shadow: 0.5 });
    // Oko żarzy się przez sukno.
    c.fill(c.oval(4.4, -10.4, 1.7, 0.85), EMBER, 0.3);
    c.fill(c.box(4.6, -10.4, 0.95, 0.3, 0.12), EMBER);
  } else {
    // Kudły spadają na czoło i oczy; spomiędzy pasm widać dwa żarzące się punkty.
    const fringe = union(
      c.oval(0.8, -13.4, 7.6, 4.2),
      c.horn(5.4, -12, 7, -7.4, 1.8, 0.4),
      c.horn(2.6, -11.6, 3.2, -6.6, 1.7, 0.4),
      c.horn(-0.6, -11.6, -0.8, -7.2, 1.7, 0.4),
      c.horn(-4, -11.6, -5, -6.8, 1.8, 0.4),
    );
    c.form(fringe, HAIR, { rag: 0.7 });
    for (const x of [1.2, 4.8]) {
      c.fill(c.dot(x, -8.6, 1.1), EMBER, 0.3);
      c.fill(c.dot(x, -8.6, 0.5), EMBER);
    }
  }
  if (options.brows) {
    c.ink(
      c.poly([
        [2.4, -15.6],
        [5.2, -17.6],
        [6, -14.6],
      ]),
      SKIN.light,
      SKIN.dark,
    );
    c.ink(
      c.poly([
        [-1.6, -15.4],
        [-3.6, -17.8],
        [-4.8, -14.8],
      ]),
      SKIN.light,
      SKIN.dark,
    );
  }

  if (options.mouth === 'shout') {
    c.fill(c.oval(3.6, -4.2, 2.7, 1.9), SKIN.dark);
    c.fill(c.oval(3.6, -4.2, 2.1, 1.3), MAW);
    for (const x of [2.2, 3.6, 5]) c.fill(c.box(x, -5.1, 0.42, 0.5, 0.1), SKIN.light);
  } else {
    c.fill(
      c.path(
        [
          [2.4, -4.2],
          [4.4, -4.6],
          [6.2, -4],
          [6.8, -3.2],
        ],
        0.3,
      ),
      SKIN.dark,
    );
  }
  return c.finish();
}

/**
 * Znak szczepu ze szkicu autora: koło przekreślone krzyżem. Rysowany na tarczy Defenixa
 * i proporcu generała; `r` to promień koła.
 */
export function emblem(c: PartCanvas, x: number, y: number, r: number, color: string): void {
  const ring = union(
    c.arc([x - r, y], [x - r, y - r], [x, y - r], 0.32, 0.32),
    c.arc([x, y - r], [x + r, y - r], [x + r, y], 0.32, 0.32),
    c.arc([x + r, y], [x + r, y + r], [x, y + r], 0.32, 0.32),
    c.arc([x, y + r], [x - r, y + r], [x - r, y], 0.32, 0.32),
  );
  c.fill(ring, color);
  const d = r * 0.72;
  c.fill(c.line(x - d, y - d, x + d, y + d, 0.3), color);
  c.fill(c.line(x - d, y + d, x + d, y - d, 0.3), color);
}
