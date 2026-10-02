// Sklep: bohaterowie na sprzedaż stoją na scenie, a pod każdym wisi metka z ceną. Każdy zakup
// to nowy egzemplarz bohatera w formie bazowej; tę samą linię można kupić wiele razy.
import { useSignal } from '@preact/signals';
import { useMemo } from 'preact/hooks';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { ownedCount } from '../game/progress.ts';
import { type ShopStand, shopStands } from '../game/shop-stage.ts';
import { Gold, ScreenHead, StatTable, unitName } from './common.tsx';
import { SquadIcon } from './icons.tsx';

/** Najszersza metka w procentach szerokości sceny. */
const MAX_TAG_WIDTH = 14;
/** Odstęp między sąsiednimi metkami w procentach szerokości sceny. */
const TAG_GAP = 1.5;

/** Szerokość metki: tyle, żeby sąsiednie metki nie nachodziły na siebie. */
function tagWidth(stands: readonly ShopStand[]): number {
  let closest = 1;
  for (const a of stands) {
    for (const b of stands) {
      if (a !== b) closest = Math.min(closest, Math.abs(a.position - b.position));
    }
  }
  return Math.min(MAX_TAG_WIDTH, closest * 100 - TAG_GAP);
}

export function ShopScreen(props: { game: Game }) {
  const { game } = props;
  const { content } = game;
  const save = game.save.value;
  const stands = useMemo(() => shopStands(content), [content]);
  const width = useMemo(() => tagWidth(stands), [stands]);
  const selected = useSignal<string | null>(stands[0]?.line ?? null);
  const shown = stands.find((stand) => stand.line === selected.value);
  const shownLine = shown === undefined ? undefined : content.lines.get(shown.line);
  const shownUnit = shown === undefined ? undefined : content.heroes.get(shown.unitId);

  return (
    <div class="screen shop">
      <ScreenHead game={game} title={t('nav.shop')}>
        <button
          type="button"
          class="btn"
          data-nav="squad"
          onClick={() => game.go({ name: 'squad' })}
        >
          <SquadIcon />
          {t('nav.squad')}
        </button>
      </ScreenHead>

      <p class="shop-hint">{t('shop.hint')}</p>

      {/* Karta stoi nad wybranym bohaterem; przy krawędzi sceny dosuwa się do środka. */}
      {shown !== undefined && shownLine !== undefined && shownUnit !== undefined && (
        <section
          class="sheet shop-sheet"
          data-details={shown.line}
          style={{ left: `clamp(13.5em, ${shown.position * 100}%, 100% - 13.5em)` }}
        >
          <h3 class="hero-name">{unitName(shown.unitId)}</h3>
          <p class="note">{t('shop.evolves', { name: unitName(shownLine.forms[1]) })}</p>
          <StatTable spec={shownUnit.base} />
        </section>
      )}

      {stands.map((stand) => {
        const line = content.lines.get(stand.line);
        if (line === undefined) return null;
        return (
          <article
            key={stand.line}
            class="shop-tag"
            data-line={stand.line}
            style={{ left: `${stand.position * 100}%`, width: `${width}%` }}
          >
            <button
              type="button"
              class="tag-name"
              aria-pressed={selected.value === stand.line}
              onClick={() => {
                selected.value = stand.line;
              }}
            >
              {unitName(stand.unitId)}
            </button>
            <button
              type="button"
              class="btn btn-primary"
              data-action="buy"
              disabled={save.gold < line.price}
              onClick={() => {
                selected.value = stand.line;
                game.buyHero(stand.line);
              }}
            >
              {t('shop.buy')}
              <Gold amount={line.price} />
            </button>
            <p class="tag-owned" data-owned={ownedCount(save, stand.line)}>
              {t('shop.owned', { count: ownedCount(save, stand.line) })}
            </p>
          </article>
        );
      })}
    </div>
  );
}
