// Odwzorowanie pola walki symulacji (oś X w podjednostkach) na współrzędne logiczne sceny.
import { LOGICAL_WIDTH } from './viewport.ts';

/** Wysokość linii ziemi w jednostkach logicznych; na niej stoją stopy postaci. */
export const GROUND_Y = 560;

/**
 * Margines sceny po obu stronach pola walki, w jednostkach logicznych. Krawędź pola (np. po
 * odrzucie) leży tyle od krawędzi ekranu, więc łucznik czy kapłan stoją tam bez przesuwania,
 * a paski życia i liczby obrażeń nie dotykają brzegu. Większe postacie (miecz w zamachu sięga
 * za plecy do ok. 100 jednostek) i padanie po śmierci pilnuje `keepOnStage` (reach.ts):
 * margines na ich zasięg zabrałby jedną szóstą sceny.
 */
export const ARENA_MARGIN = 48;

export interface Camera {
  /** Jednostki logiczne sceny na podjednostkę świata. */
  scale: number;
  /** Położenie X początku pola walki na scenie. */
  offset: number;
}

export function createCamera(): Camera {
  return { scale: 1, offset: ARENA_MARGIN };
}

/** Skala pola o szerokości `arenaWidth`: całe pole mieści się między marginesami sceny. */
export function arenaScale(arenaWidth: number): number {
  return (LOGICAL_WIDTH - 2 * ARENA_MARGIN) / arenaWidth;
}

/** Położenie X punktu pola walki na scenie, w jednostkach logicznych. */
export function arenaToStageX(x: number, arenaWidth: number): number {
  return ARENA_MARGIN + x * arenaScale(arenaWidth);
}

/** Punkt pola walki leżący w danym miejscu sceny (odwrotność `arenaToStageX`), bez zaokrągleń. */
export function stageToArenaX(stageX: number, arenaWidth: number): number {
  return (stageX - ARENA_MARGIN) / arenaScale(arenaWidth);
}

/** Dopasowuje kamerę tak, by całe pole walki zajmowało szerokość sceny bez marginesów. */
export function fitCamera(camera: Camera, arenaWidth: number): void {
  camera.scale = arenaScale(arenaWidth);
  camera.offset = ARENA_MARGIN;
}
