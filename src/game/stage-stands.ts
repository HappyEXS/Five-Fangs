// Bohaterowie wystawieni na scenie poza walką: w sklepie stoją linie na sprzedaż, na ekranie
// informacji o bohaterach obie formy wybranej linii. Ten moduł ustala, gdzie kto stoi; korzysta
// z niego canvas (battle-stage.ts) i ekrany UI, żeby metki trafiały dokładnie pod postacie.
import type { UnitVisual } from '../content/compile.ts';
import type { GameContent } from '../content/load.ts';
import type { BattleSetup, UnitSpec } from '../sim/types.ts';
import { SQUAD_SLOTS } from './save-schema.ts';

export interface Stand {
  /** Id jednostki bohatera stojącej na stanowisku. */
  readonly unitId: string;
  /** Pozycja na scenie jako ułamek jej szerokości, 0..1. */
  readonly position: number;
  /** 0 = lewa strona sceny (patrzy w prawo), 1 = prawa strona (patrzy w lewo). */
  readonly side: 0 | 1;
  readonly slot: number;
}

export interface ShopStand extends Stand {
  /** Id linii bohatera; `unitId` to jej forma bazowa, którą kupuje gracz. */
  readonly line: string;
}

/** Margines sceny po bokach, żeby skrajne postacie i ich metki nie wychodziły poza ekran. */
const EDGE = 0.12;
/** Odstęp między lewą a prawą grupą, gdy linii jest więcej niż slotów jednej strony. */
const MIDDLE_GAP = 0.04;
/** Miejsca formy bazowej i formy po ewolucji na ekranie informacji o bohaterach. */
const BASE_FORM_AT = 0.37;
const EVOLVED_FORM_AT = 0.63;

function spread(count: number, from: number, to: number): number[] {
  if (count === 1) return [(from + to) / 2];
  return Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));
}

/**
 * Stanowiska sklepu w kolejności linii z treści gry. Do pięciu linii stoi w jednym rzędzie;
 * przy większej liczbie druga połowa staje po prawej stronie sceny, zwrócona do pierwszej.
 * Scena mieści dziesięć postaci, więc linie ponad ten limit nie dostają stanowiska.
 */
export function shopStands(content: GameContent): ShopStand[] {
  const lines = [...content.lines.values()].slice(0, SQUAD_SLOTS * 2);
  const split = lines.length <= SQUAD_SLOTS ? lines.length : Math.ceil(lines.length / 2);
  const left = lines.slice(0, split);
  const right = lines.slice(split);
  const leftTo = right.length === 0 ? 1 - EDGE : 0.5 - MIDDLE_GAP;
  const leftAt = spread(left.length, EDGE, leftTo);
  const rightAt = spread(right.length, 0.5 + MIDDLE_GAP, 1 - EDGE);
  return [
    ...left.map((line, slot) => ({
      line: line.id,
      unitId: line.forms[0],
      position: leftAt[slot] ?? EDGE,
      side: 0 as const,
      slot,
    })),
    ...right.map((line, slot) => ({
      line: line.id,
      unitId: line.forms[0],
      position: rightAt[slot] ?? 1 - EDGE,
      side: 1 as const,
      slot,
    })),
  ];
}

/**
 * Stanowiska obu form jednej linii: bazowa z lewej, po ewolucji z prawej, obie zwrócone w prawo,
 * więc czyta się je jak drogę od jednej do drugiej. Pusta lista, gdy linii nie ma w treści.
 */
export function formStands(content: GameContent, lineId: string): Stand[] {
  const line = content.lines.get(lineId);
  if (line === undefined) return [];
  // Slot 0 gracza leży najdalej w prawo, więc forma po ewolucji dostaje slot 0.
  return [
    { unitId: line.forms[0], position: BASE_FORM_AT, side: 0, slot: 1 },
    { unitId: line.forms[1], position: EVOLVED_FORM_AT, side: 0, slot: 0 },
  ];
}

export interface StandScene {
  readonly setup: BattleSetup;
  /** Wygląd jednostek pod ich `unitId`, jak w `levelVisuals`. */
  readonly visuals: (UnitVisual | null)[];
}

/**
 * Wejście symulacji, które ustawia bohaterów na ich stanowiskach. Nikt tu nie walczy: renderer
 * pokazuje tę „walkę” w ticku zerowym. Puste sloty lewej strony leżą na lewej krawędzi, prawej
 * na prawej.
 */
export function standScene(content: GameContent, stands: readonly Stand[]): StandScene {
  const { width } = content.arena;
  const playerSlots = new Array<number>(SQUAD_SLOTS).fill(0);
  const enemySlots = new Array<number>(SQUAD_SLOTS).fill(width);
  const player = new Array<UnitSpec | null>(SQUAD_SLOTS).fill(null);
  const enemy = new Array<UnitSpec | null>(SQUAD_SLOTS).fill(null);
  const visuals = new Array<UnitVisual | null>(SQUAD_SLOTS * 2).fill(null);
  for (const stand of stands) {
    const unit = content.heroes.get(stand.unitId);
    if (unit === undefined) continue;
    const x = Math.round(stand.position * width);
    if (stand.side === 0) {
      playerSlots[stand.slot] = x;
      player[stand.slot] = unit.base;
      visuals[stand.slot] = unit.visual;
    } else {
      enemySlots[stand.slot] = x;
      enemy[stand.slot] = unit.base;
      visuals[SQUAD_SLOTS + stand.slot] = unit.visual;
    }
  }
  return {
    setup: { arena: { ...content.arena, playerSlots, enemySlots }, player, enemy },
    visuals,
  };
}
