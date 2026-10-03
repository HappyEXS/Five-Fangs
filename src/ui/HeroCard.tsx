// Karta wybranego bohatera na ekranie składu: tylko do czytania. Statystyki z podglądem
// następnego zakupu; wszystkie działania (runy, ulepszenia, ewolucja) są w polu bohatera
// na scenie (HeroField.tsx).
import type { Game } from '../game/game.ts';
import { nextPurchase } from '../game/hero-options.ts';
import { t } from '../game/i18n.ts';
import type { HeroView } from '../game/progress.ts';
import { StatTable, tierLabel, unitName } from './common.tsx';

/** Nazwa bohatera z liczbą ulepszeń: odróżnia egzemplarze tej samej linii. */
export function heroLabel(view: HeroView): string {
  const name = unitName(view.unitId);
  return view.hero.upgrades > 0 ? `${name} +${view.hero.upgrades}` : name;
}

export function HeroCard(props: { game: Game; view: HeroView }) {
  const { game, view } = props;
  const { content } = game;
  const save = game.save.value;
  const heroId = view.hero.id;
  const inSquad = save.squad.includes(heroId);
  const purchase = nextPurchase(content, save, heroId);
  const single = purchase !== null && purchase.options.length === 1 ? purchase.options[0] : null;
  return (
    <div class="hero-card" data-hero={heroId}>
      <h3 class="hero-name">{unitName(view.unitId)}</h3>
      <p class="hero-form">
        <span>{tierLabel(view.line.forms.get(view.hero.form)?.tier ?? 0)}</span>
        <span>
          {t('heroes.upgrades', {
            count: view.hero.upgrades,
            max: content.progression.maxUpgrades,
          })}
        </span>
      </p>
      {/* Przy kilku drogach ewolucji podgląd nie wie, którą gracz wybierze: porównanie jest
          w okienku wyboru drogi. */}
      <StatTable spec={view.spec} next={single?.spec ?? null} />
      {purchase !== null && (
        <p class="note">
          {purchase.kind === 'upgrade'
            ? t('heroes.card.upgrade')
            : single !== null
              ? t('heroes.card.evolve', { name: unitName(single.unitId) })
              : t('heroes.card.evolve.choice')}
        </p>
      )}
      {!inSquad && <p class="note">{t('heroes.card.bench')}</p>}
    </div>
  );
}
