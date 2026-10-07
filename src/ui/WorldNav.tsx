// Przełączanie światów na mapie: nazwa świata z rzędem kłów (po jednym na świat) u góry
// i dwie duże strzałki po bokach sceny. Strzałka pokazuje sąsiedni świat także wtedy, gdy gracz
// jeszcze do niego nie doszedł: widać tło, szlak i nazwy poziomów, a kafle są zablokowane.
import { worldNameKey } from '../content/i18n/keys.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { isLevelUnlocked, isWorldCleared } from '../game/progress.ts';
import { FANG_PATH } from './icons.tsx';

/** Blokowa strzałka w polu 100×100: w prawo i jej odbicie w lewo. */
const ARROW_NEXT = '6,32 50,32 50,8 95,50 50,92 50,68 6,68';
const ARROW_PREVIOUS = '94,32 50,32 50,8 5,50 50,92 50,68 94,68';

export function worldName(worldId: string): string {
  return tName(worldNameKey(worldId));
}

type WorldState = 'cleared' | 'open' | 'locked';

function worldState(game: Game, worldIndex: number): WorldState {
  const world = game.content.worlds[worldIndex];
  const save = game.save.value;
  if (world === undefined) return 'locked';
  if (isWorldCleared(game.content, save, world.id)) return 'cleared';
  const first = world.levels[0];
  return first !== undefined && isLevelUnlocked(game.content, save, first) ? 'open' : 'locked';
}

/** Nazwa pokazywanego świata i rząd kłów: który to świat z ilu i które są już odbite. */
export function WorldHead(props: { game: Game; worldIndex: number }) {
  const { game, worldIndex } = props;
  const { worlds } = game.content;
  const shown = worlds[worldIndex];
  if (shown === undefined) return null;
  return (
    <div class="world-head">
      <h2 class="world-name">{worldName(shown.id)}</h2>
      {worlds.length > 1 && (
        <nav class="world-pips" aria-label={t('map.worlds')}>
          {worlds.map((world, index) => {
            const state = worldState(game, index);
            return (
              <button
                key={world.id}
                type="button"
                class={`world-pip world-pip-${state}`}
                data-world={world.id}
                data-state={state}
                aria-pressed={index === worldIndex}
                aria-label={t('map.world.pip', {
                  index: index + 1,
                  count: worlds.length,
                  name: worldName(world.id),
                  state: t(`map.world.state.${state}`),
                })}
                title={worldName(world.id)}
                onClick={() => game.openWorld(world.id)}
              >
                <svg viewBox="0 0 40 52" aria-hidden="true">
                  <path d={FANG_PATH} />
                </svg>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/** Duża strzałka przy krawędzi sceny: `step` -1 prowadzi do poprzedniego świata, 1 do następnego. */
export function WorldArrow(props: { game: Game; worldIndex: number; step: -1 | 1 }) {
  const { game, step } = props;
  const target = game.content.worlds[props.worldIndex + step];
  const label = t(step < 0 ? 'map.world.previous' : 'map.world.next');
  const shape = step < 0 ? ARROW_PREVIOUS : ARROW_NEXT;
  return (
    <button
      type="button"
      class={step < 0 ? 'world-arrow world-arrow-previous' : 'world-arrow world-arrow-next'}
      data-action={step < 0 ? 'previous-world' : 'next-world'}
      disabled={target === undefined}
      aria-label={target === undefined ? label : `${label}: ${worldName(target.id)}`}
      title={target === undefined ? undefined : worldName(target.id)}
      onClick={() => {
        if (target !== undefined) game.openWorld(target.id);
      }}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <polygon class="arrow-shadow" points={shape} />
        <polygon class="arrow-face" points={shape} />
      </svg>
    </button>
  );
}
