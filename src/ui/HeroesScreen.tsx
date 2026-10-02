// Informacje o bohaterach: obie formy wybranej linii stoją na scenie, obok każdej jej karta
// ze statystykami, a pod linią podłogi droga ulepszeń i ewolucji z kosztami. Tu niczego się nie
// kupuje: bohaterów sprzedaje sklep, a ulepszenia i ewolucję ekran składu.
import type { CompiledLine } from '../content/load-progression.ts';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { ownedCount } from '../game/progress.ts';
import { formStands } from '../game/stage-stands.ts';
import { Gold, ScreenHead, StatTable, unitName } from './common.tsx';
import { FANG_PATH } from './icons.tsx';

/** Karta jednej formy: nazwa, która to forma, statystyki bez ulepszeń i cechy. */
function FormSheet(props: { game: Game; unitId: string; form: 0 | 1 }) {
  const unit = props.game.content.heroes.get(props.unitId);
  if (unit === undefined) return null;
  return (
    <section class={props.form === 0 ? 'sheet form-sheet' : 'sheet form-sheet form-evolved'}>
      <h3 class="hero-name">{unitName(props.unitId)}</h3>
      <p class="note">{t(props.form === 0 ? 'heroes.form.base' : 'heroes.form.evolved')}</p>
      <StatTable spec={unit.base} />
    </section>
  );
}

/** Ulepszenia jednej formy jako rząd kłów z kosztami: te same kły liczą ulepszenia w składzie. */
function UpgradeSteps(props: { costs: readonly number[]; position: number }) {
  const steps = props.costs.map((cost, index) => ({ cost, step: index + 1 }));
  return (
    <ol class="path-steps" style={{ left: `${props.position * 100}%` }}>
      {steps.map(({ cost, step }) => (
        <li key={step} class="path-step" title={t('heroes.path.upgrade', { step })}>
          <svg class="pip pip-on" viewBox="0 0 40 52" aria-hidden="true">
            <path d={FANG_PATH} />
          </svg>
          <span class="visually-hidden">{t('heroes.path.upgrade', { step })}</span>
          <Gold amount={cost} />
        </li>
      ))}
    </ol>
  );
}

function LineInfo(props: { game: Game; line: CompiledLine }) {
  const { game, line } = props;
  const { content } = game;
  const { maxUpgrades, upgradePercent } = content.progression;
  const [base, evolved] = formStands(content, line.id);
  if (base === undefined || evolved === undefined) return null;
  return (
    <>
      <FormSheet game={game} unitId={base.unitId} form={0} />
      <FormSheet game={game} unitId={evolved.unitId} form={1} />

      <section class="evolve-info">
        <p>{t('heroes.info.upgrade', { percent: upgradePercent })}</p>
        <p>{t('heroes.info.evolve', { max: maxUpgrades, name: unitName(evolved.unitId) })}</p>
        <p>{t('heroes.info.where')}</p>
        <p class="evolve-price">
          <span>{t('heroes.info.price')}</span>
          <Gold amount={line.price} />
          <span>{t('shop.owned', { count: ownedCount(game.save.value, line.id) })}</span>
        </p>
      </section>

      {/* Droga jednej linii: ulepszenia formy bazowej, ewolucja, ulepszenia formy drugiej. */}
      <UpgradeSteps costs={line.upgradeCosts[0]} position={base.position} />
      <p class="path-evolve" data-evolve-cost={line.evolveCost}>
        <span class="path-evolve-name">{t('heroes.path.evolve')}</span>
        <Gold amount={line.evolveCost} />
      </p>
      <UpgradeSteps costs={line.upgradeCosts[1]} position={evolved.position} />
    </>
  );
}

export function HeroesScreen(props: { game: Game; line: string | null }) {
  const { game } = props;
  const { content } = game;
  const line = props.line === null ? undefined : content.lines.get(props.line);
  return (
    <div class="screen heroes">
      <ScreenHead game={game} title={t('nav.heroes')} />
      <nav class="line-tabs" aria-label={t('heroes.lines')}>
        {[...content.lines.values()].map((option) => (
          <button
            key={option.id}
            type="button"
            class="btn"
            data-line={option.id}
            aria-pressed={option.id === props.line}
            onClick={() => game.openHeroes(option.id)}
          >
            {unitName(option.forms[0])}
          </button>
        ))}
      </nav>
      {line !== undefined && <LineInfo game={game} line={line} />}
    </div>
  );
}
