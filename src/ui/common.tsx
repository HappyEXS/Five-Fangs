// Elementy wspólne ekranów: pasek górny, tabela statystyk, nazwy z treści gry.
import type { ComponentChildren } from 'preact';
import { unitNameKey } from '../content/i18n/keys.ts';
import type { Rune } from '../content/schema-progression.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { displayStats, traitsOf, type UnitSpec } from '../game/stats.ts';

export function unitName(unitId: string): string {
  return tName(unitNameKey(unitId));
}

export function runeLabel(rune: Rune): string {
  return t(rune.stat === 'attack' ? 'rune.attack' : 'rune.maxHp', { value: rune.value });
}

/** Pasek górny ekranu: powrót, tytuł, złoto i dodatkowe przyciski. */
export function TopBar(props: {
  game: Game;
  title: string;
  onBack: () => void;
  children?: ComponentChildren;
}) {
  return (
    <header class="topbar">
      <button type="button" class="button" onClick={props.onBack}>
        {t('common.back')}
      </button>
      <h2 class="topbar-title">{props.title}</h2>
      <span class="topbar-spacer" />
      {props.children}
      <span class="gold">{t('common.gold', { gold: props.game.save.value.gold })}</span>
    </header>
  );
}

function one(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

/**
 * Statystyki efektywne jednostki. `next` to specyfikacja po planowanej zmianie (ulepszenie,
 * ewolucja); różnice pokazujemy obok wartości bieżących.
 */
export function StatTable(props: { spec: UnitSpec; next?: UnitSpec | null }) {
  const now = displayStats(props.spec);
  const then = props.next == null ? null : displayStats(props.next);
  const rows = [
    ['stat.maxHp', now.maxHp, then?.maxHp],
    ['stat.attack', now.attack, then?.attack],
    ['stat.attackRate', now.attackRate, then?.attackRate],
    ['stat.dps', now.damagePerSecond, then?.damagePerSecond],
    ['stat.range', now.range, then?.range],
    ['stat.moveSpeed', now.moveSpeed, then?.moveSpeed],
    ['stat.knockback', now.knockback, then?.knockback],
  ] as const;
  return (
    <div class="stats">
      <dl>
        {rows.map(([key, value, after]) => (
          <div class="stat" key={key}>
            <dt>{t(key)}</dt>
            <dd>
              {one(value)}
              {after !== undefined && one(after) !== one(value) && (
                <span class="stat-next"> → {one(after)}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {traitsOf(props.spec).map((trait) => (
        <p class="trait" key={trait.key}>
          {t(trait.key, trait.params)}
        </p>
      ))}
    </div>
  );
}
