// Mapa poziomów: światy po kolei, poziomy odblokowywane jeden po drugim. Mapa nie zmienia
// składu: pokazuje przeciwników i nagrody wybranego poziomu i zaczyna walkę bieżącym składem.
import { levelNameKey, worldNameKey } from '../content/i18n/keys.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { isLevelCleared, isLevelUnlocked, isSquadEmpty, victoryRewards } from '../game/progress.ts';
import { formatBattleTime } from '../game/stats.ts';
import { runeLabel, TopBar, unitName } from './common.tsx';

function LevelDetails(props: { game: Game; level: string }) {
  const { game, level } = props;
  const { content } = game;
  const save = game.save.value;
  const compiled = content.levels.get(level);
  const rewards = victoryRewards(content, save, level);
  if (compiled === undefined || rewards === null) return null;
  const rune = rewards.rune === null ? undefined : content.runes.get(rewards.rune);
  const best = save.levels[level]?.bestTicks ?? null;
  const empty = isSquadEmpty(save);
  return (
    <section class="panel level-details" data-details={level}>
      <h3>{tName(levelNameKey(level))}</h3>
      <h4>{t('map.enemies')}</h4>
      <ul>
        {compiled.enemies.map((enemy) => (
          <li key={enemy.slot}>
            {unitName(enemy.unit)}{' '}
            <span class="dim">{t('map.enemy.level', { level: enemy.level })}</span>
          </li>
        ))}
      </ul>
      <h4>{t('map.reward')}</h4>
      <ul class="rewards">
        <li>
          {t('map.reward.gold', { gold: rewards.gold })}
          {!rewards.firstClear && (
            <span class="dim">
              {' '}
              {t('result.reward.replay', { percent: content.progression.replayGoldPercent })}
            </span>
          )}
        </li>
        {rune !== undefined && <li>{runeLabel(rune)}</li>}
      </ul>
      {best !== null && <p class="dim">{t('map.best', { time: formatBattleTime(best) })}</p>}
      {empty && <p class="dim">{t('map.squad.empty')}</p>}
      <button
        type="button"
        class="button button-primary"
        data-action="fight"
        disabled={empty}
        onClick={() => game.startBattle(level)}
      >
        {t('map.fight')}
      </button>
    </section>
  );
}

export function MapScreen(props: { game: Game; selected: string | null }) {
  const { game, selected } = props;
  const { content } = game;
  const save = game.save.value;
  return (
    <div class="screen map">
      <TopBar game={game} title={t('hub.map')} onBack={() => game.go({ name: 'hub' })}>
        <button type="button" class="button" onClick={() => game.go({ name: 'squad' })}>
          {t('hub.squad')}
        </button>
      </TopBar>
      <div class="map-body">
        <div class="worlds">
          {content.worlds.map((world) => (
            <section class="world panel" key={world.id}>
              <h3>{tName(worldNameKey(world.id))}</h3>
              <ol class="levels">
                {world.levels.map((id, index) => {
                  const level = content.levels.get(id);
                  if (level === undefined) return null;
                  const unlocked = isLevelUnlocked(content, save, id);
                  const cleared = isLevelCleared(save, id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        class={`level${cleared ? ' level-cleared' : ''}`}
                        data-level={id}
                        aria-pressed={selected === id}
                        disabled={!unlocked}
                        onClick={() => game.openMap(id)}
                      >
                        <span class="level-number">{index + 1}</span>
                        <span class="level-name">{tName(levelNameKey(id))}</span>
                        <span class="level-state">
                          {!unlocked
                            ? t('map.level.locked')
                            : cleared
                              ? t('map.level.cleared')
                              : t('map.level.open')}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
        {selected === null ? (
          <section class="panel level-details">
            <p class="dim">{t('map.select')}</p>
          </section>
        ) : (
          <LevelDetails game={game} level={selected} />
        )}
      </div>
    </div>
  );
}
