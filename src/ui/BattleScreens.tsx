// HUD walki i arkusz wyniku. W walce gracz może tylko wstrzymać, zmienić prędkość albo wyjść;
// w dolnych rogach widzi miniaturki postaci, które jeszcze żyją: swoje z lewej, wroga z prawej.
// Po walce widzi nagrody i jednym przyciskiem wraca na mapę.
import { useEffect, useRef } from 'preact/hooks';
import { levelNameKey } from '../content/i18n/keys.ts';
import type { StageControls } from '../game/battle-stage.ts';
import type { BattleOutcome, Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import type { Rewards } from '../game/progress.ts';
import type { BattleSpeed } from '../game/save-schema.ts';
import { formatBattleTime } from '../game/stats.ts';
import { formatNumber, runeColor, runeLabel, unitName } from './common.tsx';
import type { Gate } from './gate.ts';
import { Coin, FangMark } from './icons.tsx';
import { Portrait } from './Portrait.tsx';

const SPEEDS: readonly BattleSpeed[] = [1, 2, 4];

/**
 * Miniaturki jednej strony w kolejności ze sceny. Poległy zostaje w drzewie jeszcze na czas
 * zejścia (CSS), ale czytniki ekranu już go nie widzą.
 */
function Faces(props: { stage: StageControls; side: 'player' | 'enemy' }) {
  const { stage, side } = props;
  const faces = stage.faces.value.filter((face) => face.side === side);
  return (
    <ul class={`hud-faces hud-faces-${side}`} aria-label={t(`battle.faces.${side}`)}>
      {faces.map((face) => (
        <li
          key={face.unit}
          class="hud-face"
          data-unit={face.unitId}
          data-alive={String(face.alive)}
          aria-hidden={!face.alive}
          title={unitName(face.unitId)}
        >
          <Portrait stage={stage} unit={face.unitId} mirrored={side === 'enemy'} />
          <span class="visually-hidden">{unitName(face.unitId)}</span>
        </li>
      ))}
    </ul>
  );
}

export function BattleHud(props: { game: Game; gate: Gate; stage: StageControls; level: string }) {
  const { game, gate, stage } = props;
  const paused = stage.paused.value;
  const speed = game.save.value.settings.battleSpeed;
  return (
    <div class="screen hud">
      <header class="hud-level">
        <h2 class="hud-name">{tName(levelNameKey(props.level))}</h2>
        <p class="hud-time">
          {stage.assets.value === 'ready'
            ? t('battle.time', {
                time: formatBattleTime(stage.battleTick.value),
                limit: formatBattleTime(game.content.arena.timeLimitTicks),
              })
            : t('battle.loading')}
        </p>
      </header>
      <div class="hud-controls">
        <button type="button" class="btn" aria-pressed={paused} onClick={stage.togglePause}>
          {t(paused ? 'battle.resume' : 'battle.pause')}
        </button>
        <div class="hud-speed">
          {SPEEDS.map((option) => (
            <button
              key={option}
              type="button"
              class="btn"
              aria-pressed={speed === option}
              onClick={() => game.setBattleSpeed(option)}
            >
              {t('battle.speed', { speed: option })}
            </button>
          ))}
        </div>
        <button
          type="button"
          class="btn"
          onClick={() => void gate.pass(() => game.openMap(props.level))}
        >
          {t('battle.exit')}
        </button>
      </div>
      <Faces stage={stage} side="player" />
      <Faces stage={stage} side="enemy" />
    </div>
  );
}

function RewardList(props: { game: Game; rewards: Rewards }) {
  const { game, rewards } = props;
  const rune = rewards.rune === null ? undefined : game.content.runes.get(rewards.rune);
  return (
    <>
      <ul class="rewards">
        <li class="reward">
          <Coin />
          {t('result.reward.gold', { gold: formatNumber(rewards.gold) })}
        </li>
        {rune !== undefined && (
          <li class="reward">
            <span>{t('result.reward.rune')}</span>
            <span class={`rune-tag ${runeColor(rune)}`}>{runeLabel(rune)}</span>
          </li>
        )}
      </ul>
      {!rewards.firstClear && (
        <p class="note">
          {t('result.reward.replay', { percent: game.content.progression.replayGoldPercent })}
        </p>
      )}
    </>
  );
}

export function ResultScreen(props: {
  game: Game;
  gate: Gate;
  level: string;
  battle: BattleOutcome;
  rewards: Rewards | null;
}) {
  const { game, level, battle, rewards } = props;
  const won = battle.outcome === 'win';
  // Jedyny przycisk dostaje fokus, żeby Enter od razu wracał na mapę.
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ok.current?.focus();
  }, []);
  // Po pierwszym przejściu mapa wybiera kolejny poziom; po porażce i powtórce zostaje na tym samym.
  const advance = rewards?.firstClear === true;
  return (
    <div class="screen result">
      <section class="sheet result-sheet" data-outcome={battle.outcome}>
        <FangMark />
        <h2 class="result-title">{t(won ? 'result.win' : 'result.loss')}</h2>
        <p class="result-level">
          {t('result.summary', {
            level: tName(levelNameKey(level)),
            time: formatBattleTime(battle.ticks),
          })}
        </p>
        {rewards !== null ? (
          <RewardList game={game} rewards={rewards} />
        ) : (
          <>
            <p>{t(`result.reason.${battle.reason}`)}</p>
            <p class="note">{t('result.loss.hint')}</p>
          </>
        )}
        <button
          ref={ok}
          type="button"
          class="btn btn-primary btn-big"
          data-action="ok"
          onClick={() => void props.gate.pass(() => game.openMap(advance ? undefined : level))}
        >
          {t('common.ok')}
        </button>
      </section>
    </div>
  );
}
