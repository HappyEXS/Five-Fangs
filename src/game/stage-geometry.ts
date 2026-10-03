// Przeliczanie pozycji na polu walki na miejsce na scenie i z powrotem. Renderer rysuje pole
// z marginesem po bokach (render/camera.ts), więc UI, które stawia podpisy pod postaciami,
// i stanowiska poza walką liczą położenie tą samą drogą.
import { arenaToStageX, stageToArenaX } from '../render/camera.ts';
import { LOGICAL_WIDTH } from '../render/viewport.ts';

/** Miejsce punktu pola walki na scenie jako ułamek jej szerokości, 0..1. */
export function stageFraction(x: number, arenaWidth: number): number {
  return arenaToStageX(x, arenaWidth) / LOGICAL_WIDTH;
}

/**
 * Punkt pola walki (liczba całkowita), który renderer narysuje w danym miejscu sceny. Miejsca
 * poza polem przycina do jego krawędzi.
 */
export function arenaXAt(fraction: number, arenaWidth: number): number {
  const x = Math.round(stageToArenaX(fraction * LOGICAL_WIDTH, arenaWidth));
  return Math.min(arenaWidth, Math.max(0, x));
}
