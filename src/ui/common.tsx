// Elementy wspólne ekranów: nagłówek ekranu, sakiewka, tabela statystyk, nazwy z treści gry.
import { lineNameKey, unitNameKey } from '../content/i18n/keys.ts';
import type { Rune } from '../content/schema-progression.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { displayStats, traitsOf, type UnitSpec } from '../game/stats.ts';
import { InfoButton } from './InfoButton.tsx';
import { Coin } from './icons.tsx';

export function unitName(unitId: string): string {
  return tName(unitNameKey(unitId));
}

/** Nazwa szczepu, czyli linii bohaterów z jednym drzewem ewolucji. */
export function lineName(lineId: string): string {
  return tName(lineNameKey(lineId));
}

export function runeLabel(rune: Rune): string {
  return t(rune.stat === 'attack' ? 'rune.attack' : 'rune.maxHp', { value: rune.value });
}

/** Nazwa stopnia formy w drzewie ewolucji: forma bazowa albo ewolucja kolejnego stopnia. */
export function tierLabel(tier: number): string {
  return tier === 0 ? t('heroes.tier.base') : t('heroes.tier', { tier });
}

/** Klasa koloru runy: zielony dla życia, czerwony dla ataku. */
export function runeColor(rune: Rune): string {
  return rune.stat === 'maxHp' ? 'rune-hp' : 'rune-attack';
}

/** Liczba z odstępem co trzy cyfry: „12 500” czyta się szybciej niż „12500”. */
export function formatNumber(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Złoto gracza: moneta i liczba. */
export function Purse(props: { game: Game }) {
  const { gold } = props.game.save.value;
  return (
    <span class="purse" title={t('common.gold', { gold })} data-gold={gold}>
      <Coin />
      <span class="purse-amount">{formatNumber(gold)}</span>
    </span>
  );
}

/** Kwota w złocie wewnątrz tekstu albo przycisku. */
export function Gold(props: { amount: number }) {
  return (
    <span class="gold-amount">
      <Coin />
      {formatNumber(props.amount)}
    </span>
  );
}

/**
 * Nagłówek ekranów otwieranych z mapy: „Wróć” zawsze prowadzi na mapę, obok tytuł i sakiewka.
 * Między tymi ekranami nie ma przejść na skróty, więc gracz zawsze wie, dokąd wróci.
 * `info` to zasady ekranu: zamiast stać na scenie, czekają pod przyciskiem „i” przy tytule.
 */
export function ScreenHead(props: { game: Game; title: string; info?: readonly string[] }) {
  return (
    <header class="screen-head">
      <button type="button" class="btn" data-action="back" onClick={() => props.game.openMap()}>
        {t('common.back')}
      </button>
      <h2 class="screen-title">{props.title}</h2>
      {props.info !== undefined && <InfoButton topic={props.title} lines={props.info} />}
      <span class="spacer" />
      <Purse game={props.game} />
    </header>
  );
}

function one(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

export type StatKey =
  | 'stat.maxHp'
  | 'stat.attack'
  | 'stat.attackRate'
  | 'stat.dps'
  | 'stat.range'
  | 'stat.moveSpeed'
  | 'stat.knockback';

/**
 * Statystyki efektywne jednostki. `next` to specyfikacja po planowanej zmianie (ulepszenie,
 * ewolucja); różnice pokazujemy obok wartości bieżących, a cechy są cechami po zmianie, bo
 * ewolucja może je wymienić. `rows` zawęża tabelę do wybranych statystyk.
 */
export function StatTable(props: {
  spec: UnitSpec;
  next?: UnitSpec | null;
  rows?: readonly StatKey[];
}) {
  const now = displayStats(props.spec);
  const then = props.next == null ? null : displayStats(props.next);
  const all = [
    ['stat.maxHp', now.maxHp, then?.maxHp],
    ['stat.attack', now.attack, then?.attack],
    ['stat.attackRate', now.attackRate, then?.attackRate],
    ['stat.dps', now.damagePerSecond, then?.damagePerSecond],
    ['stat.range', now.range, then?.range],
    ['stat.moveSpeed', now.moveSpeed, then?.moveSpeed],
    ['stat.knockback', now.knockback, then?.knockback],
  ] as const;
  const shown = props.rows;
  const rows = shown === undefined ? all : all.filter(([key]) => shown.includes(key));
  return (
    <div class="stats">
      <dl>
        {rows.map(([key, value, after]) => (
          <div class="stat" key={key}>
            <dt>{t(key)}</dt>
            <dd>
              {one(value)}
              {after !== undefined && one(after) !== one(value) && (
                <span class={after > value ? 'stat-next' : 'stat-next stat-less'}>
                  {one(after)}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {traitsOf(props.next ?? props.spec).map((trait) => (
        <p class="trait" key={trait.key}>
          {t(trait.key, trait.params)}
        </p>
      ))}
    </div>
  );
}
