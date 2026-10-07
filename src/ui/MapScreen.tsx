// Ekran główny: mapa poziomów nad sceną, na której skład gracza stoi naprzeciw przeciwników
// wybranego poziomu. Mapa nie zmienia składu; do składu i sklepu prowadzą zakładki z boku.
// Gra ma kilka światów: mapa pokazuje świat wybranego poziomu (jego szlak, tło i nazwy),
// a duże strzałki po bokach przełączają ją na sąsiedni (WorldNav.tsx).
import { useSignal } from '@preact/signals';
import { levelNameKey } from '../content/i18n/keys.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import {
  heroView,
  isLevelUnlocked,
  isSquadEmpty,
  previousLevel,
  victoryRewards,
} from '../game/progress.ts';
import { SQUAD_SLOTS } from '../game/save-schema.ts';
import { stageFraction } from '../game/stage-geometry.ts';
import { formatBattleTime } from '../game/stats.ts';
import { Gold, Purse, runeColor, runeLabel, unitName } from './common.tsx';
import type { Gate } from './gate.ts';
import { BookIcon, FangMark, Gear, SquadIcon, TagIcon } from './icons.tsx';
import { Trail } from './MapTrail.tsx';
import { Settings } from './Settings.tsx';
import { WorldArrow, WorldHead } from './WorldNav.tsx';

const SLOTS = Array.from({ length: SQUAD_SLOTS }, (_, slot) => slot);

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
        {rune !== undefined && <span class={`rune-tag ${runeColor(rune)}`}>{runeLabel(rune)}</span>}
        {best !== null && (
          <span class="plaque-best">{t('map.best', { time: formatBattleTime(best) })}</span>
        )}
      </p>
    </section>
  );
}

export function MapScreen(props: { game: Game; gate: Gate; selected: string | null }) {
  const { game, gate, selected } = props;
  const { content } = game;
  const save = game.save.value;
  const settings = useSignal(false);
  const level = selected === null ? undefined : content.levels.get(selected);
  // Mapa pokazuje świat wybranego poziomu; strzałki wybierają poziom w sąsiednim świecie.
  const worldIndex = Math.max(
    0,
    content.worlds.findIndex((world) => world.id === level?.world),
  );
  const empty = isSquadEmpty(save);
  // Zablokowany poziom można obejrzeć (przeciwnicy, nagroda), ale nie da się na nim walczyć.
  const locked = selected !== null && !isLevelUnlocked(content, save, selected);
  const unlocksAfter = locked && selected !== null ? previousLevel(content, selected) : null;
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

      <WorldHead game={game} worldIndex={worldIndex} />
      {content.worlds.length > 1 && (
        <>
          <WorldArrow game={game} worldIndex={worldIndex} step={-1} />
          <WorldArrow game={game} worldIndex={worldIndex} step={1} />
        </>
      )}
      <Trail game={game} worldIndex={worldIndex} selected={selected} />

      {selected !== null && <Plaque game={game} level={selected} />}

      {/* Pod każdą postacią podpis: nazwa i liczba wzmocnień ponad wartości bazowe, u bohaterów
          gracza ulepszenia, u przeciwników ich poziom. Ten sam zapis po obu stronach. */}
      {SLOTS.map((slot) => {
        const heroId = save.squad[slot] ?? null;
        const view = heroId === null ? null : heroView(content, save, heroId);
        if (view === null) return null;
        return (
          <p
            key={slot}
            class="unit-tag unit-tag-hero"
            data-hero={view.hero.id}
            style={{ left: `${stageFraction(arena.playerSlots[slot] ?? 0, arena.width) * 100}%` }}
          >
            <span class="unit-name">{unitName(view.unitId)}</span>
            {view.hero.upgrades > 0 && <span class="unit-level">+{view.hero.upgrades}</span>}
          </p>
        );
      })}

      {level?.enemies.map((enemy) => (
        <p
          key={enemy.slot}
          class="unit-tag unit-tag-enemy"
          style={{
            left: `${stageFraction(arena.enemySlots[enemy.slot] ?? 0, arena.width) * 100}%`,
          }}
        >
          <span class="unit-name">{unitName(enemy.unit)}</span>
          {enemy.level > 0 && <span class="unit-level">+{enemy.level}</span>}
        </p>
      ))}

      <div class="fight">
        {selected !== null && (
          <button
            type="button"
            class="btn btn-primary btn-big"
            data-action="fight"
            disabled={empty || locked}
            onClick={() => void gate.pass(() => game.startBattle(selected))}
          >
            {t('map.fight')}
          </button>
        )}
        {empty && <p class="fight-note">{t('map.squad.empty')}</p>}
        {unlocksAfter !== null && (
          <p class="fight-note" data-locked={selected}>
            {t('map.locked', { level: tName(levelNameKey(unlocksAfter)) })}
          </p>
        )}
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
