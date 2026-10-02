// Odwzorowanie pola walki symulacji (oś X w podjednostkach) na współrzędne logiczne sceny.
import { LOGICAL_WIDTH } from './viewport.ts';

/** Wysokość linii ziemi w jednostkach logicznych; na niej stoją stopy postaci. */
export const GROUND_Y = 560;

export interface Camera {
  /** Jednostki logiczne sceny na podjednostkę świata. */
  scale: number;
}

export function createCamera(): Camera {
  return { scale: 1 };
}

/** Dopasowuje kamerę tak, by całe pole walki zajmowało szerokość sceny. */
export function fitCamera(camera: Camera, arenaWidth: number): void {
  camera.scale = LOGICAL_WIDTH / arenaWidth;
}
