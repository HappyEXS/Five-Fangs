// Ekran główny: mapa poziomów nad sceną, na której skład gracza stoi naprzeciw przeciwników
// wybranego poziomu. Mapa nie zmienia składu; do składu i sklepu prowadzą zakładki z boku.
import { useSignal } from '@preact/signals';
import { levelNameKey, worldNameKey } from '../content/i18n/keys.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { isLevelCleared, isLevelUnlocked, isSquadEmpty, victoryRewards } from '../game/progress.ts';
import { SQUAD_SLOTS } from '../game/save-schema.ts';
import { formatBattleTime } from '../game/stats.ts';
import { Gold, Purse, runeLabel, unitName } from './common.tsx';
import {
  BookIcon,
  FANG_PATH,
  FangMark,
  FangStamp,
  Gear,
  Lock,
  SquadIcon,
  TagIcon,
} from './icons.tsx';
import { Settings } from './Settings.tsx';

const SLOTS = Array.from({ length: SQUAD_SLOTS }, (_, slot) => slot);

/**
 * Kształty kafli w polu 100×80: nieregularne wielokąty, jakby wycięte nożyczkami. Ostatni
 * poziom świata (boss) ma własny kształt z zębatą górą.
 */
const TILE_SHAPES = [
  '6,10 92,4 97,66 60,76 8,71 2,40',
  '4,6 58,2 96,11 93,70 40,77 6,65',
  '8,4 93,9 98,44 89,73 11,76 3,30',
  '3,13 50,4 95,7 96,69 53,77 5,71',
];
const BOSS_SHAPE = '4,22 19,6 33,20 50,3 67,20 81,6 96,22 95,70 50,78 5,70';

interface TileSpot {
  /** Środek kafla w procentach pola mapy. */
  readonly x: number;
  readonly y: number;
  /** Obrót w stopniach. */
  readonly tilt: number;
  readonly shape: string;
}

/**
 * Miejsca kafli jednego świata: szlak idzie zygzakiem od lewej do prawej, a każdy kafel jest
 * trochę przesunięty i obrócony. Rozrzut wynika z numeru poziomu i świata, więc mapa wygląda
 * tak samo przy każdym otwarciu.
 */
function tileSpots(count: number, world: number): TileSpot[] {
  return Array.from({ length: count }, (_, i) => {
    const wobble = ((i * 37 + world * 17 + 5) % 11) - 5;
    return {
      x: count === 1 ? 50 : 8 + (84 * i) / (count - 1),
      y: (i % 2 === 0 ? 66 : 30) + wobble * 1.6,
      tilt: ((i * 53 + world * 29 + 3) % 9) - 4,
      shape: i === count - 1 ? BOSS_SHAPE : (TILE_SHAPES[(i + world) % TILE_SHAPES.length] ?? ''),
    };
  });
}

function Trail(props: { game: Game; worldIndex: number; selected: string | null }) {
  const { game, selected } = props;
  const { content } = game;
  const save = game.save.value;
  const world = content.worlds[props.worldIndex];
  if (world === undefined) return null;
  const spots = tileSpots(world.levels.length, props.worldIndex);
  return (
    <div class="trail">
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
                aria-pressed={selected === id}
                disabled={!unlocked}
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

/** Tabliczka wybranego poziomu: nazwa i to, co da wygrana. */
function Plaque(props: { game: Game; level: string }) {
  const { game, level } = props;
  const { content } = game;
  const save = game.save.value;
  const rewards = victoryRewards(content, save, level);
  if (rewards === null) return null;
  const rune = rewards.rune === null ? undefined : content.runes.get(rewards.rune);
  const best = save.levels[level]?.bestTicks ?? null;
  return (
    <section class="plaque" data-details={level}>
      <h2 class="plaque-name">{tName(levelNameKey(level))}</h2>
      {/* Jedna linia pod nazwą: tabliczka nie może zasłonić pasków życia wysokich postaci. */}
      <p class="plaque-reward">
        <span>{t(rewards.firstClear ? 'map.reward' : 'map.reward.replay')}</span>
        <Gold amount={rewards.gold} />
        {rune !== undefined && <span class="rune-tag">{runeLabel(rune)}</span>}
        {best !== null && (
          <span class="plaque-best">{t('map.best', { time: formatBattleTime(best) })}</span>
        )}
      </p>
    </section>
  );
}

export function MapScreen(props: { game: Game; selected: string | null }) {
  const { game, selected } = props;
  const { content } = game;
  const save = game.save.value;
  const settings = useSignal(false);
  const level = selected === null ? undefined : content.levels.get(selected);
  // Mapa pokazuje świat wybranego poziomu; strzałki pozwalają obejrzeć pozostałe.
  const homeWorld = Math.max(
    0,
    content.worlds.findIndex((world) => world.id === level?.world),
  );
  const shownWorld = useSignal(homeWorld);
  const worldIndex = Math.min(shownWorld.value, content.worlds.length - 1);
  const world = content.worlds[worldIndex];
  const empty = isSquadEmpty(save);
  const { arena } = content;

  return (
    <div class="screen map">
      <header class="corner-mark">
        <FangMark />
        <h1 class="wordmark">{t('app.title')}</h1>
      </header>
      <div class="corner-purse">
        <Purse game={game} />
      </div>

      <nav class="rail" aria-label={t('nav.label')}>
        <button
          type="button"
          class="btn rail-btn"
          data-nav="squad"
          onClick={() => game.go({ name: 'squad' })}
        >
          <SquadIcon />
          {t('nav.squad')}
        </button>
        <button
          type="button"
          class="btn rail-btn"
          data-nav="heroes"
          onClick={() => game.openHeroes()}
        >
          <BookIcon />
          {t('nav.heroes')}
        </button>
        <button
          type="button"
          class="btn rail-btn"
          data-nav="shop"
          onClick={() => game.go({ name: 'shop' })}
        >
          <TagIcon />
          {t('nav.shop')}
        </button>
        <button
          type="button"
          class="btn rail-btn"
          data-nav="settings"
          onClick={() => {
            settings.value = true;
          }}
        >
          <Gear />
          {t('nav.settings')}
        </button>
      </nav>

      {world !== undefined && (
        <div class="world-head">
          {content.worlds.length > 1 && (
            <button
              type="button"
              class="btn btn-small"
              disabled={worldIndex === 0}
              aria-label={t('map.world.previous')}
              onClick={() => {
                shownWorld.value = worldIndex - 1;
              }}
            >
              ‹
            </button>
          )}
          <h2 class="world-name">{tName(worldNameKey(world.id))}</h2>
          {content.worlds.length > 1 && (
            <button
              type="button"
              class="btn btn-small"
              disabled={worldIndex === content.worlds.length - 1}
              aria-label={t('map.world.next')}
              onClick={() => {
                shownWorld.value = worldIndex + 1;
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
      <Trail game={game} worldIndex={worldIndex} selected={selected} />

      {selected !== null && <Plaque game={game} level={selected} />}

      {/* Pięć kłów pod linią podłogi to pięć slotów składu; pełny kieł oznacza zajęty slot. */}
      {SLOTS.map((slot) => (
        <svg
          key={slot}
          class={save.squad[slot] == null ? 'fang fang-empty' : 'fang'}
          style={{ left: `${((arena.playerSlots[slot] ?? 0) / arena.width) * 100}%` }}
          viewBox="0 0 40 52"
          aria-hidden="true"
        >
          <path d={FANG_PATH} />
        </svg>
      ))}

      {level?.enemies.map((enemy) => (
        <p
          key={enemy.slot}
          class="enemy-tag"
          style={{ left: `${((arena.enemySlots[enemy.slot] ?? 0) / arena.width) * 100}%` }}
        >
          <span class="enemy-name">{unitName(enemy.unit)}</span>
          {/* Ten sam zapis co przy bohaterach: liczba wzmocnień ponad wartości bazowe. */}
          {enemy.level > 0 && <span class="enemy-level">+{enemy.level}</span>}
        </p>
      ))}

      <div class="fight">
        {selected !== null && (
          <button
            type="button"
            class="btn btn-primary btn-big"
            data-action="fight"
            disabled={empty}
            onClick={() => game.startBattle(selected)}
          >
            {t('map.fight')}
          </button>
        )}
        {empty && <p class="fight-note">{t('map.squad.empty')}</p>}
      </div>

      {settings.value && (
        <Settings
          game={game}
          onClose={() => {
            settings.value = false;
          }}
        />
      )}
    </div>
  );
}
