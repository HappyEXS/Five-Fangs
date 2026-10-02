// Sklep: kupowanie bohaterów za złoto. Każdy zakup to nowy egzemplarz bohatera w formie
// bazowej; tę samą linię można kupić wiele razy.
import type { CompiledLine } from '../content/load-progression.ts';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { ownedCount } from '../game/progress.ts';
import { StatTable, TopBar, unitName } from './common.tsx';

function ShopCard(props: { game: Game; line: CompiledLine }) {
  const { game, line } = props;
  const save = game.save.value;
  const base = game.content.heroes.get(line.forms[0]);
  if (base === undefined) return null;
  const owned = ownedCount(save, line.id);
  return (
    <article class="panel shop-card" data-line={line.id}>
      <h3>{unitName(line.forms[0])}</h3>
      <p class="dim">{t('shop.evolves', { name: unitName(line.forms[1]) })}</p>
      <StatTable spec={base.base} />
      <p class="dim">{t('shop.owned', { count: owned })}</p>
      <button
        type="button"
        class="button button-primary"
        data-action="buy"
        disabled={save.gold < line.price}
        onClick={() => game.buyHero(line.id)}
      >
        {t('shop.buy', { price: line.price })}
      </button>
    </article>
  );
}

export function ShopScreen(props: { game: Game }) {
  const { game } = props;
  return (
    <div class="screen shop">
      <TopBar game={game} title={t('hub.shop')} onBack={() => game.go({ name: 'hub' })}>
        <button type="button" class="button" onClick={() => game.go({ name: 'squad' })}>
          {t('hub.squad')}
        </button>
      </TopBar>
      <p class="dim shop-hint">{t('shop.hint')}</p>
      <div class="shop-cards">
        {[...game.content.lines.values()].map((line) => (
          <ShopCard key={line.id} game={game} line={line} />
        ))}
      </div>
    </div>
  );
}
