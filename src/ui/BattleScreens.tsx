// HUD walki i ekran wyniku. W walce gracz może tylko wstrzymać, zmienić prędkość albo wyjść.
import { levelNameKey } from '../content/i18n/keys.ts';
import type { StageControls } from '../game/battle-stage.ts';
import type { BattleOutcome, Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { nextLevel, type Rewards } from '../game/progress.ts';
import type { BattleSpeed } from '../game/save-schema.ts';
import { formatBattleTime } from '../game/stats.ts';
import { runeLabel } from './common.tsx';

const SPEEDS: readonly BattleSpeed[] = [1, 2, 4];

export function BattleHud(props: { game: Game; stage: StageControls; level: string }) {
  const { game, stage } = props;
  const paused = stage.paused.value;
  const speed = game.save.value.settings.battleSpeed;
  return (
    <div class="screen hud">
      <header class="topbar">
        <h2 class="topbar-title">{tName(levelNameKey(props.level))}</h2>
        <span class="hud-time">
          {stage.assets.value === 'ready'
            ? t('battle.time', {
                time: formatBattleTime(stage.battleTick.value),
                limit: formatBattleTime(game.content.arena.timeLimitTicks),
              })
            : t('battle.loading')}
        </span>
        <span class="topbar-spacer" />
        <button type="button" class="button" aria-pressed={paused} onClick={stage.togglePause}>
          {t(paused ? 'battle.resume' : 'battle.pause')}
        </button>
        {SPEEDS.map((option) => (
          <button
            key={option}
            type="button"
            class="button"
            aria-pressed={speed === option}
            onClick={() => game.setBattleSpeed(option)}
          >
            {t('battle.speed', { speed: option })}
          </button>
        ))}
        <button type="button" class="button" onClick={() => game.openMap(props.level)}>
          {t('battle.exit')}
        </button>
      </header>
    </div>
  );
}

function RewardList(props: { game: Game; rewards: Rewards }) {
  const { game, rewards } = props;
  const rune = rewards.rune === null ? undefined : game.content.runes.get(rewards.rune);
  return (
    <ul class="rewards">
      <li>
        {t('result.reward.gold', { gold: rewards.gold })}
        {!rewards.firstClear && (
          <span class="dim">
            {' '}
            {t('result.reward.replay', { percent: game.content.progression.replayGoldPercent })}
          </span>
        )}
      </li>
      {rune !== undefined && <li>{t('result.reward.rune', { rune: runeLabel(rune) })}</li>}
    </ul>
  );
}

export function ResultScreen(props: {
  game: Game;
  level: string;
  battle: BattleOutcome;
  rewards: Rewards | null;
}) {
  const { game, level, battle, rewards } = props;
  const won = battle.outcome === 'win';
  const next = won ? nextLevel(game.content, level) : null;
  return (
    <div class="screen result">
      <section class="panel result-panel" data-outcome={battle.outcome}>
        <h2 class={won ? 'result-win' : 'result-loss'}>{t(won ? 'result.win' : 'result.loss')}</h2>
        <p class="dim">{tName(levelNameKey(level))}</p>
        {!won && <p>{t(`result.reason.${battle.reason}`)}</p>}
        <p>{t('result.time', { time: formatBattleTime(battle.ticks) })}</p>
        {rewards !== null && <RewardList game={game} rewards={rewards} />}
        <nav class="result-actions">
          {/* Następny poziom otwiera się na mapie: gracz widzi przeciwników, zanim zacznie. */}
          {next !== null && (
            <button
              type="button"
              class="button button-primary"
              data-action="next"
              onClick={() => game.openMap(next)}
            >
              {t('result.next')}
            </button>
          )}
          <button
            type="button"
            class={next === null ? 'button button-primary' : 'button'}
            onClick={() => game.startBattle(level)}
          >
            {t('result.retry')}
          </button>
          <button type="button" class="button" onClick={() => game.go({ name: 'squad' })}>
            {t('hub.squad')}
          </button>
          <button type="button" class="button" onClick={() => game.go({ name: 'shop' })}>
            {t('hub.shop')}
          </button>
          <button type="button" class="button" onClick={() => game.openMap(level)}>
            {t('hub.map')}
          </button>
          <button type="button" class="button" onClick={() => game.go({ name: 'hub' })}>
            {t('result.hub')}
          </button>
        </nav>
      </section>
    </div>
  );
}
