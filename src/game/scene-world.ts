// Który świat widać na scenie: od niego zależy tło (ADR 0022). Mapa pokazuje świat wybranego
// poziomu, walka i jej wynik świat swojego poziomu, ekran startowy świat, do którego gracz
// doszedł. Pozostałe ekrany (skład, sklep, bohaterowie) nie mają własnego świata: zostaje na
// nich tło ekranu, z którego gracz przyszedł.
import type { GameContent } from '../content/load.ts';
import type { BackdropId } from '../content/schema-progression.ts';
import type { Scene } from './game.ts';
import { currentLevel } from './progress.ts';
import type { Save } from './save-schema.ts';

/** Poziom, którego świat pokazuje scena, albo null, gdy scena nie należy do żadnego świata. */
function sceneLevel(content: GameContent, save: Save, scene: Scene): string | null {
  switch (scene.name) {
    case 'map':
      return scene.selected;
    case 'battle':
    case 'result':
      return scene.level;
    case 'title':
      return currentLevel(content, save);
    default:
      return null;
  }
}

/** Tło sceny albo null, gdy scena zostawia tło poprzedniej. */
export function sceneBackdrop(content: GameContent, save: Save, scene: Scene): BackdropId | null {
  const level = sceneLevel(content, save, scene);
  const worldId = level === null ? undefined : content.levels.get(level)?.world;
  if (worldId === undefined) return null;
  return content.worlds.find((world) => world.id === worldId)?.backdrop ?? null;
}
