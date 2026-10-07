// Szlak poziomów jednego świata na mapie: nieregularne kafle połączone przerywaną linią.
// Każdy świat ma własny kształt szlaku, żeby mapy różniły się nie tylko tłem. Kafel zablokowanego
// poziomu też da się wybrać: mapa pokazuje wtedy, kto na nim czeka, ale walki nie zacznie.
import { levelNameKey } from '../content/i18n/keys.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { isLevelCleared, isLevelUnlocked } from '../game/progress.ts';
import { FangStamp, Lock } from './icons.tsx';
import { tileSpots } from './trail-layout.ts';

export function Trail(props: { game: Game; worldIndex: number; selected: string | null }) {
  const { game, selected } = props;
  const { content } = game;
  const save = game.save.value;
  const world = content.worlds[props.worldIndex];
  if (world === undefined) return null;
  const spots = tileSpots(world.levels.length, props.worldIndex);
  return (
    <div class="trail" data-world={world.id}>
      {/* Szlak łączy kafle w kolejności odblokowywania. */}
      <svg class="trail-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={spots.map((spot) => `${spot.x},${spot.y}`).join(' ')} />
      </svg>
      <ol class="trail-tiles">
        {world.levels.map((id, index) => {
          const spot = spots[index];
          if (spot === undefined) return null;
          const unlocked = isLevelUnlocked(content, save, id);
          const cleared = isLevelCleared(save, id);
          const boss = index === world.levels.length - 1;
          const state = !unlocked ? 'locked' : cleared ? 'cleared' : 'open';
          return (
            <li
              key={id}
              class="tile-spot"
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, rotate: `${spot.tilt}deg` }}
            >
              <button
                type="button"
                class={`tile tile-${state}${boss ? ' tile-boss' : ''}`}
                data-level={id}
                data-state={state}
                aria-pressed={selected === id}
                onClick={() => game.openMap(id)}
              >
                <svg
                  class="tile-shape"
                  viewBox="0 0 100 80"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polygon class="tile-shadow" points={spot.shape} />
                  <polygon class="tile-face" points={spot.shape} />
                </svg>
                <span class="tile-number">{index + 1}</span>
                <span class="tile-name">{tName(levelNameKey(id))}</span>
                {cleared && <FangStamp />}
                {!unlocked && <Lock />}
                <span class="visually-hidden">
                  {t(
                    !unlocked
                      ? 'map.level.locked'
                      : cleared
                        ? 'map.level.cleared'
                        : 'map.level.open',
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
