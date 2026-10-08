// Sklep: samo kupowanie. U góry drzewko run, w którym wydaje się żetony run (RuneTree.tsx).
// Bohaterowie na sprzedaż stoją na scenie, a pod każdym wisi metka z ceną. Każdy zakup to nowy egzemplarz bohatera w formie bazowej; tę samą linię można kupić
// wiele razy; mówi o tym okienko pod przyciskiem „i” przy tytule. Statystyki i ewolucję opisuje
// ekran informacji o bohaterach.
import { useMemo } from 'preact/hooks';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { ownedCount } from '../game/progress.ts';
import { type ShopStand, shopStands } from '../game/stage-stands.ts';
import { Gold, ScreenHead, unitName } from './common.tsx';
import { RuneTree } from './RuneTree.tsx';

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

  return (
    <div class="screen shop">
      <ScreenHead
        game={game}
        title={t('nav.shop')}
        info={[t('shop.info.copy'), t('shop.info.again')]}
      />

      <RuneTree game={game} />

      {stands.map((stand) => {
        const line = content.lines.get(stand.line);
        if (line === undefined) return null;
        const owned = ownedCount(save, stand.line);
        return (
          <article
            key={stand.line}
            class="shop-tag"
            data-line={stand.line}
            style={{ left: `${stand.position * 100}%`, width: `${width}%` }}
          >
            <h3 class="tag-name">{unitName(stand.unitId)}</h3>
            <button
              type="button"
              class="btn btn-primary"
              data-action="buy"
              disabled={save.gold < line.price}
              onClick={() => game.buyHero(stand.line)}
            >
              {t('shop.buy')}
              <Gold amount={line.price} />
            </button>
            <p class="tag-owned" data-owned={owned}>
              {t('shop.owned', { count: owned })}
            </p>
          </article>
        );
      })}
    </div>
  );
}
