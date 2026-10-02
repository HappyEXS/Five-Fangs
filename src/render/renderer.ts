// Interfejs renderera walki (ADR 0001). Reszta gry zna tylko ten interfejs; implementacja
// na Canvas 2D jest w canvas-renderer.ts. Renderer czyta stan symulacji, nigdy go nie zmienia.
import type { UnitVisual } from '../content/compile.ts';
import type { Battle, EventBuffer } from '../sim/index.ts';
import type { Viewport } from './viewport.ts';

export interface Renderer {
  /**
   * Przygotowuje renderer do nowej walki. `visuals` to wygląd jednostek indeksowany `unitId`
   * (null dla pustego slotu); symulacja o wyglądzie nic nie wie.
   */
  beginBattle(battle: Battle, visuals: readonly (UnitVisual | null)[]): void;
  /** Przyjmuje zdarzenia jednego ticka. Wołane po każdym `stepBattle`, przed `draw`. */
  consume(events: EventBuffer): void;
  /**
   * Rysuje klatkę. `alpha` to postęp między poprzednim a bieżącym tickiem (0..1),
   * `frameMs` czas od poprzedniej klatki przeskalowany prędkością gry.
   */
  draw(viewport: Viewport, alpha: number, frameMs: number): void;
  /**
   * Wskazuje jednostkę rysowaną na wierzchu pozostałych; -1 przywraca zwykłą kolejność.
   * Podgląd składu wyróżnia tak bohatera, którego gracz właśnie przeciąga. `beginBattle`
   * zeruje to ustawienie.
   */
  setTopUnit(unit: number): void;
  /** Zwalnia odwołanie do walki. */
  endBattle(): void;
}
