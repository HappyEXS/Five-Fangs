// Pole bohatera na ekranie składu: nad postacią gniazda run, pod nią pasek ulepszeń i zakup.
// Tylko ekran składu pokazuje te elementy; mapa i walka widzą samą postać.
import type { Rune } from '../content/schema-progression.ts';
import type { Game } from '../game/game.ts';
import { nextPurchase } from '../game/hero-options.ts';
import { t } from '../game/i18n.ts';
import type { HeroView } from '../game/progress.ts';
import { Gold, runeColor, runeLabel, unitName } from './common.tsx';

/** Runa jako okrągły żeton: zielony dla życia, czerwony dla ataku, z premią do statystyki. */
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

/** Pasek ulepszeń bieżącej formy: jeden odcinek na ulepszenie, pełny = kupione. */
export function UpgradeBar(props: { game: Game; view: HeroView }) {
  const { maxUpgrades } = props.game.content.progression;
  const { upgrades, form } = props.view.hero;
  const segments = Array.from({ length: maxUpgrades }, (_, segment) => segment);
  return (
    <div
      class={form === 0 ? 'upgrade-bar' : 'upgrade-bar upgrade-bar-evolved'}
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
 * Przycisk zakupu: „Kup” z kosztem ulepszenia, a po komplecie ulepszeń formy bazowej
 * „Ewolucja” z jej kosztem. Po komplecie formy drugiej zamiast przycisku jest napis.
 */
export function BuyButton(props: { game: Game; view: HeroView; onBuy: () => void }) {
  const { game, view } = props;
  const save = game.save.value;
  const heroId = view.hero.id;
  const purchase = nextPurchase(game.content, save, heroId);
  if (purchase === null) return <p class="field-full">{t('heroes.upgrade.full')}</p>;
  const evolve = purchase.kind === 'evolve';
  return (
    <button
      type="button"
      class="btn btn-primary btn-small"
      data-action={purchase.kind}
      disabled={save.gold < purchase.cost}
      aria-label={
        evolve
          ? t('heroes.evolve.buy', { name: unitName(purchase.unitId), cost: purchase.cost })
          : t('heroes.upgrade.buy', { cost: purchase.cost })
      }
      onClick={() => {
        props.onBuy();
        if (evolve) game.evolve(heroId);
        else game.upgrade(heroId);
      }}
    >
      {t(evolve ? 'heroes.evolve.short' : 'shop.buy')}
      <Gold amount={purchase.cost} />
    </button>
  );
}
