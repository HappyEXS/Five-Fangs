// Klucze i18n składane z id treści. Walidator treści pilnuje, że każdy z nich istnieje w słowniku.

/** Klucz i18n z nazwą jednostki. */
export function unitNameKey(unitId: string): string {
  return `unit.${unitId}.name`;
}

/** Klucz i18n z nazwą linii bohaterów, czyli szczepu. */
export function lineNameKey(lineId: string): string {
  return `line.${lineId}.name`;
}

/** Klucz i18n z nazwą szczepu wrogów. */
export function tribeNameKey(tribeId: string): string {
  return `tribe.${tribeId}.name`;
}

/** Klucz i18n z nazwą stopnia w szczepie wrogów (zwiadowca, generał, boss). */
export function rankNameKey(rank: string): string {
  return `rank.${rank}`;
}

/** Klucz i18n z nazwą świata. */
export function worldNameKey(worldId: string): string {
  return `world.${worldId}.name`;
}

/** Klucz i18n z nazwą poziomu. */
export function levelNameKey(levelId: string): string {
  return `level.${levelId}.name`;
}
