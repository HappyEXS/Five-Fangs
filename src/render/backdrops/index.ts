// Tła światów: po jednym na każde id z treści gry. Typ rekordu pilnuje, że żadne nie zostało
// bez rysunku.
import type { BackdropId } from '../../content/schema-progression.ts';
import { castle } from './castle.ts';
import { citadel } from './citadel.ts';
import { jungle } from './jungle.ts';
import type { BackdropSpec } from './kit.ts';
import { mechanus } from './mechanus.ts';
import { swamps } from './swamps.ts';
import { tower } from './tower.ts';

export const BACKDROP_SPECS: Readonly<Record<BackdropId, () => BackdropSpec>> = {
  castle,
  mechanus,
  swamps,
  jungle,
  tower,
  citadel,
};

/** Tło, gdy nikt nie wskazał świata: narzędzia dev i pierwsza klatka przed wczytaniem gry. */
export const DEFAULT_BACKDROP: BackdropId = 'castle';
