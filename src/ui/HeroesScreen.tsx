// Bohaterowie: ulepszenia, ewolucja i runy. Reguły i koszty liczy game/progress.ts.
import { levelNameKey } from '../content/i18n/keys.ts';
import type { CompiledLine } from '../content/load-progression.ts';
import type { Game, Scene } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import {
  evolveCost,
  freeRunes,
  lineView,
  previewEvolve,
  previewUpgrade,
  upgradeCost,
} from '../game/progress.ts';
import { runeLabel, StatTable, TopBar, unitName } from './common.tsx';

function RuneSlots(props: { game: Game; line: string }) {
  const { game, line } = props;
  const { content } = game;
  const save = game.save.value;
  const state = save.lines[line];
  if (state === undefined) return null;
  // Każdą wolną runę pokazujemy raz, nawet gdy gracz ma kilka takich samych.
  const free = [...new Set(freeRunes(save))];
  const slots = Array.from({ length: content.progression.runeSlots }, (_, slot) => slot);
  return (
    <div class="runes">
      <h4>{t('heroes.runes')}</h4>
      {slots.map((slot) => {
        const id = state.runes[slot] ?? null;
        const rune = id === null ? undefined : content.runes.get(id);
        return (
          <div class="rune-slot" key={slot}>
            {rune !== undefined ? (
              <>
                <span class="rune">{runeLabel(rune)}</span>
                <button
                  type="button"
                  class="button"
                  onClick={() => game.equipRune(line, slot, null)}
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
                  if (chosen !== '') game.equipRune(line, slot, chosen);
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

function HeroCard(props: { game: Game; line: CompiledLine }) {
  const { game, line } = props;
  const { content } = game;
  const save = game.save.value;
  const view = lineView(content, save, line.id);

  if (view === null) {
    // Linia jeszcze nieodblokowana: gracz widzi, co ją odblokowuje.
    return (
      <article class="panel hero-card hero-locked">
        <h3>{unitName(line.forms[0])}</h3>
        {line.unlockLevel !== null && (
          <p class="dim">{t('heroes.locked', { level: tName(levelNameKey(line.unlockLevel)) })}</p>
        )}
      </article>
    );
  }

  const { maxUpgrades } = content.progression;
  const upgrade = upgradeCost(content, save, line.id);
  const evolve = evolveCost(content, save, line.id);
  const evolved = previewEvolve(content, save, line.id);
  // Podgląd pokazuje skutek najbliższego zakupu: ewolucji, jeśli jest dostępna, inaczej ulepszenia.
  const next = evolve !== null ? (evolved?.spec ?? null) : previewUpgrade(content, save, line.id);
  return (
    <article class="panel hero-card" data-line={line.id}>
      <h3>{unitName(view.unitId)}</h3>
      <p class="dim">
        {t(view.state.form === 0 ? 'heroes.form.base' : 'heroes.form.evolved')} ·{' '}
        {t('heroes.upgrades', { count: view.state.upgrades, max: maxUpgrades })}
      </p>
      <StatTable spec={view.spec} next={next} />
      <div class="hero-actions">
        {upgrade !== null && (
          <button
            type="button"
            class="button button-primary"
            data-action="upgrade"
            disabled={save.gold < upgrade}
            onClick={() => game.upgrade(line.id)}
          >
            {t('heroes.upgrade', { cost: upgrade })}
          </button>
        )}
        {evolve !== null && evolved !== null && (
          <button
            type="button"
            class="button button-primary"
            data-action="evolve"
            disabled={save.gold < evolve}
            onClick={() => game.evolve(line.id)}
          >
            {t('heroes.evolve', { name: unitName(evolved.unitId), cost: evolve })}
          </button>
        )}
        {upgrade === null && evolve === null && <span class="dim">{t('heroes.upgrade.max')}</span>}
        {view.state.form === 0 && evolve === null && evolved !== null && (
          <span class="dim">
            {t('heroes.evolve.locked', { name: unitName(evolved.unitId), max: maxUpgrades })}
          </span>
        )}
      </div>
      <RuneSlots game={game} line={line.id} />
    </article>
  );
}

export function HeroesScreen(props: { game: Game; back: Scene }) {
  const { game } = props;
  const free = freeRunes(game.save.value).length;
  return (
    <div class="screen heroes">
      <TopBar game={game} title={t('heroes.title')} onBack={() => game.go(props.back)}>
        <span class="dim">{t('heroes.runes.free', { count: free })}</span>
      </TopBar>
      <div class="hero-cards">
        {[...game.content.lines.values()].map((line) => (
          <HeroCard key={line.id} game={game} line={line} />
        ))}
      </div>
    </div>
  );
}
