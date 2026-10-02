// Karta wybranego bohatera na ekranie składu: statystyki z podglądem następnego zakupu,
// ulepszenie, ewolucja i runy. Reguły i koszty liczy game/progress.ts.
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import {
  evolveCost,
  freeRunes,
  type HeroView,
  previewEvolve,
  previewUpgrade,
  upgradeCost,
} from '../game/progress.ts';
import { Gold, runeLabel, StatTable, unitName } from './common.tsx';
import { FANG_PATH } from './icons.tsx';

/** Nazwa bohatera z liczbą ulepszeń: odróżnia egzemplarze tej samej linii. */
export function heroLabel(view: HeroView): string {
  const name = unitName(view.unitId);
  return view.hero.upgrades > 0 ? `${name} +${view.hero.upgrades}` : name;
}

/** Ulepszenia jako rząd kłów: pełny kieł to kupione ulepszenie. */
function Upgrades(props: { count: number; max: number }) {
  const pips = Array.from({ length: props.max }, (_, pip) => pip);
  return (
    <span class="upgrades" data-upgrades={props.count}>
      <span>{t('heroes.upgrades', { count: props.count, max: props.max })}</span>
      <span class="pips" aria-hidden="true">
        {pips.map((pip) => (
          <svg
            key={pip}
            class={pip < props.count ? 'pip pip-on' : 'pip'}
            viewBox="0 0 40 52"
            aria-hidden="true"
          >
            <path d={FANG_PATH} />
          </svg>
        ))}
      </span>
    </span>
  );
}

function RuneSlots(props: { game: Game; view: HeroView }) {
  const { game, view } = props;
  const { content } = game;
  const heroId = view.hero.id;
  // Każdą wolną runę pokazujemy raz, nawet gdy gracz ma kilka takich samych.
  const free = [...new Set(freeRunes(game.save.value))];
  const slots = Array.from({ length: content.progression.runeSlots }, (_, slot) => slot);
  return (
    <div class="runes">
      <h4 class="sheet-title">{t('heroes.runes')}</h4>
      {slots.map((slot) => {
        const id = view.hero.runes[slot] ?? null;
        const rune = id === null ? undefined : content.runes.get(id);
        return (
          <div class="rune-slot" key={slot}>
            {rune !== undefined ? (
              <>
                <span class="rune-tag">{runeLabel(rune)}</span>
                <button
                  type="button"
                  class="btn btn-small"
                  onClick={() => game.equipRune(heroId, slot, null)}
                >
                  {t('heroes.rune.remove')}
                </button>
              </>
            ) : (
              <select
                aria-label={t('heroes.rune.slot', { slot: slot + 1 })}
                value=""
                disabled={free.length === 0}
                onChange={(event) => {
                  const chosen = event.currentTarget.value;
                  if (chosen !== '') game.equipRune(heroId, slot, chosen);
                }}
              >
                <option value="">
                  {t(free.length === 0 ? 'heroes.rune.none' : 'heroes.rune.empty')}
                </option>
                {free.map((freeId) => {
                  const freeRune = content.runes.get(freeId);
                  return freeRune === undefined ? null : (
                    <option key={freeId} value={freeId}>
                      {runeLabel(freeRune)}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function HeroDetails(props: { game: Game; view: HeroView }) {
  const { game, view } = props;
  const { content } = game;
  const save = game.save.value;
  const heroId = view.hero.id;
  const { maxUpgrades } = content.progression;
  const upgrade = upgradeCost(content, save, heroId);
  const evolve = evolveCost(content, save, heroId);
  const evolved = previewEvolve(content, save, heroId);
  // Podgląd pokazuje skutek najbliższego zakupu: ewolucji, jeśli jest dostępna, inaczej ulepszenia.
  const next = evolve !== null ? (evolved?.spec ?? null) : previewUpgrade(content, save, heroId);
  const slot = save.squad.indexOf(heroId);
  return (
    <div class="hero-details" data-hero={heroId}>
      <h3 class="hero-name">{unitName(view.unitId)}</h3>
      <p class="hero-form">
        <span>{t(view.hero.form === 0 ? 'heroes.form.base' : 'heroes.form.evolved')}</span>
        <Upgrades count={view.hero.upgrades} max={maxUpgrades} />
      </p>
      <StatTable spec={view.spec} next={next} />
      <div class="hero-actions">
        {upgrade !== null && (
          <button
            type="button"
            class="btn btn-primary"
            data-action="upgrade"
            disabled={save.gold < upgrade}
            onClick={() => game.upgrade(heroId)}
          >
            {t('heroes.upgrade')}
            <Gold amount={upgrade} />
          </button>
        )}
        {evolve !== null && evolved !== null && (
          <button
            type="button"
            class="btn btn-primary"
            data-action="evolve"
            disabled={save.gold < evolve}
            onClick={() => game.evolve(heroId)}
          >
            {t('heroes.evolve', { name: unitName(evolved.unitId) })}
            <Gold amount={evolve} />
          </button>
        )}
        {upgrade === null && evolve === null && <span>{t('heroes.upgrade.max')}</span>}
        {view.hero.form === 0 && evolve === null && evolved !== null && (
          <span class="note">
            {t('heroes.evolve.locked', { name: unitName(evolved.unitId), max: maxUpgrades })}
          </span>
        )}
      </div>
      <RuneSlots game={game} view={view} />
      {slot >= 0 && (
        <div>
          <button type="button" class="btn" onClick={() => game.removeFromSquad(slot)}>
            {t('squad.remove')}
          </button>
        </div>
      )}
    </div>
  );
}
