// Arkusz miniaturek wszystkich jednostek z treści gry: form bohaterów i jednostek specjalnych.
// Kluczem miniaturki jest id jednostki, to samo, którego używa interfejs.
import type { GameContent } from '../content/load.ts';
import type { Atlas } from '../render/atlas.ts';
import { createPortraitSheet, type PortraitSheet } from '../render/portrait.ts';
import { recordError } from './errors.ts';

/**
 * Rysuje miniaturki po wczytaniu atlasu. Miniaturki są ozdobą interfejsu, więc gdy nie da się
 * ich narysować, gra działa dalej z pustymi okienkami: błąd trafia do raportu, a wynikiem jest
 * null.
 */
export function contentPortraits(content: GameContent, atlas: Atlas): PortraitSheet | null {
  try {
    return createPortraitSheet(
      { atlas, rigs: content.rigs },
      [...content.heroes.values(), ...content.enemies.values()].map(
        (unit) => [unit.id, unit.visual] as const,
      ),
    );
  } catch (error) {
    recordError('error', error, 'portraits');
    return null;
  }
}
