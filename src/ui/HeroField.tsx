// Pole bohatera na ekranie składu: nad postacią gniazda run, pod nią pasek ulepszeń i zakup.
// Tylko ekran składu pokazuje te elementy; mapa i walka widzą samą postać.
import type { Rune } from '../content/load-progression.ts';
import type { Game } from '../game/game.ts';
import { nextPurchase } from '../game/hero-options.ts';
import { t } from '../game/i18n.ts';
import type { HeroView } from '../game/progress.ts';
import { Gold, runeColor, runeLabel, unitName } from './common.tsx';

/** Runa jako okrągły żeton: kolor mówi, którą statystykę wzmacnia, napis o ile. */
export function RuneToken(props: { rune: Rune }) {
  return <span class={`rune-token ${runeColor(props.rune)}`}>+{props.rune.value}</span>;
}

/**
 * Gniazda run nad bohaterem. Kliknięcie gniazda otwiera wybór runy; `onPick` dostaje numer
 * gniazda i przycisk, do którego wraca fokus po zamknięciu wyboru.
 */
export function RuneSockets(props: {
  game: Game;
  view: HeroView;
  onPick: (socket: number, opener: HTMLElement) => void;
}) {
  const { game, view } = props;
  const sockets = Array.from({ length: game.content.progression.runeSlots }, (_, socket) => socket);
  return (
    <div class="rune-sockets">
      {sockets.map((socket) => {
        const id = view.hero.runes[socket] ?? null;
        const rune = id === null ? undefined : game.content.runes.get(id);
        return (
          <button
            key={socket}
            type="button"
            class={rune === undefined ? 'rune-socket rune-socket-empty' : 'rune-socket'}
            data-socket={socket}
            aria-label={
              rune === undefined
                ? t('runes.socket.empty', { slot: socket + 1 })
                : t('runes.socket.filled', { slot: socket + 1, rune: runeLabel(rune) })
            }
            onClick={(event) => props.onPick(socket, event.currentTarget)}
          >
            {rune === undefined ? <span aria-hidden="true">+</span> : <RuneToken rune={rune} />}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Pasek ulepszeń bieżącej formy: jeden odcinek na ulepszenie, pełny = kupione. Kolor zależy od
 * stopnia formy, bo po każdej ewolucji ulepszenia liczą się od nowa.
 */
export function UpgradeBar(props: { game: Game; view: HeroView }) {
  const { maxUpgrades } = props.game.content.progression;
  const { upgrades, form } = props.view.hero;
  const tier = props.view.line.forms.get(form)?.tier ?? 0;
  const segments = Array.from({ length: maxUpgrades }, (_, segment) => segment);
  return (
    <div
      class={`upgrade-bar tier-${Math.min(tier, 2)}`}
      role="img"
      aria-label={t('heroes.upgrades', { count: upgrades, max: maxUpgrades })}
      data-upgrades={upgrades}
    >
      {segments.map((segment) => (
        <span key={segment} class={segment < upgrades ? 'segment segment-on' : 'segment'} />
      ))}
    </div>
  );
}

/**
 * Przycisk zakupu: „Kup” z kosztem ulepszenia, a po komplecie ulepszeń formy „Ewolucja”.
 * Gdy z formy wychodzi jedna droga, przycisk od razu ją kupuje; gdy kilka, `onChoose` otwiera
 * wybór drogi (EvolvePicker.tsx). Na końcu drogi zamiast przycisku jest napis.
 */
export function BuyButton(props: {
  game: Game;
  view: HeroView;
  onBuy: () => void;
  onChoose: (opener: HTMLElement) => void;
}) {
  const { game, view } = props;
  const save = game.save.value;
  const heroId = view.hero.id;
  const purchase = nextPurchase(game.content, save, heroId);
  if (purchase === null) return <p class="field-full">{t('heroes.upgrade.full')}</p>;
  const [first, ...rest] = purchase.options;
  if (purchase.kind === 'evolve' && rest.length > 0) {
    // Koszt na przycisku tylko wtedy, gdy wszystkie drogi kosztują tyle samo.
    const same = rest.every((option) => option.cost === first.cost);
    const cheapest = Math.min(first.cost, ...rest.map((option) => option.cost));
    return (
      <button
        type="button"
        class="btn btn-primary btn-small"
        data-action="choose-evolve"
        disabled={save.gold < cheapest}
        aria-label={t('heroes.evolve.choose')}
        onClick={(event) => {
          props.onBuy();
          props.onChoose(event.currentTarget);
        }}
      >
        {t('heroes.evolve.short')}
        {same && <Gold amount={first.cost} />}
      </button>
    );
  }
  const evolve = purchase.kind === 'evolve';
  return (
    <button
      type="button"
      class="btn btn-primary btn-small"
      data-action={purchase.kind}
      disabled={save.gold < first.cost}
      aria-label={
        evolve
          ? t('heroes.evolve.buy', { name: unitName(first.unitId), cost: first.cost })
          : t('heroes.upgrade.buy', { cost: first.cost })
      }
      onClick={() => {
        props.onBuy();
        if (evolve) game.evolve(heroId, first.unitId);
        else game.upgrade(heroId);
      }}
    >
      {t(evolve ? 'heroes.evolve.short' : 'shop.buy')}
      <Gold amount={first.cost} />
    </button>
  );
}
