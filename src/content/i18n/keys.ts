// Klucze i18n składane z id treści. Walidator treści pilnuje, że każdy z nich istnieje w słowniku.

/** Klucz i18n z nazwą jednostki. */
export function unitNameKey(unitId: string): string {
  return `unit.${unitId}.name`;
}

/** Klucz i18n z nazwą świata. */
export function worldNameKey(worldId: string): string {
  return `world.${worldId}.name`;
}

/** Klucz i18n z nazwą poziomu. */
export function levelNameKey(levelId: string): string {
  return `level.${levelId}.name`;
}
