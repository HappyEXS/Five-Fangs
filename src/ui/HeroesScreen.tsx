// Informacje o bohaterach: zakładki szczepów i drzewo ewolucji wybranego (ADR 0016). U góry drzewo form
// (kolumna to stopień, rozwidlenie to wybór drogi; każda forma ma swoją miniaturkę), na scenie
// postacie drogi przez wybraną formę, z prawej jej karta. Tu niczego się nie kupuje: bohaterów
// sprzedaje sklep, a ulepszenia i ewolucje ekran składu. Zasady ulepszeń i ewolucji są pod
// przyciskiem „i” przy tytule.
import type { CompiledLine } from '../content/load-progression.ts';
import type { StageControls } from '../game/battle-stage.ts';
import { formPath, treeLayout } from '../game/evolution.ts';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { formStands } from '../game/stage-stands.ts';
import { Gold, lineName, ScreenHead, StatTable, tierLabel, unitName } from './common.tsx';
import { InfoButton } from './InfoButton.tsx';
import { Portrait } from './Portrait.tsx';

/** Drzewo form linii jako siatka przycisków; wybrana forma jest wyróżniona. */
function Tree(props: { game: Game; stage: StageControls; line: CompiledLine; form: string }) {
  const { game, stage, line, form } = props;
  const onPath = new Set(formPath(line, form));
  return (
    <ol class="tree" aria-label={t('heroes.tree')}>
      {treeLayout(line).map((cell) => {
        const node = line.forms.get(cell.unit);
        if (node === undefined) return null;
        const classes = ['tree-node', onPath.has(cell.unit) ? 'tree-path' : ''];
        return (
          <li
            key={cell.unit}
            class="tree-cell"
            style={{
              gridColumn: `${cell.tier + 1}`,
              gridRow: `${cell.row + 1} / span ${cell.rows}`,
            }}
          >
            {node.from !== null && (
              <span class="tree-cost">
                <Gold amount={node.evolveCost} />
              </span>
            )}
            <button
              type="button"
              class={classes.filter((name) => name !== '').join(' ')}
              data-form={cell.unit}
              aria-pressed={cell.unit === form}
              onClick={() => game.openHeroes(line.id, cell.unit)}
            >
              <Portrait stage={stage} unit={cell.unit} />
              <span class="tree-name">{unitName(cell.unit)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Karta formy: stopień, skąd się bierze (forma bazowa ze sklepu, pozostałe z ewolucji) i za ile,
 * dokąd prowadzi, statystyki i koszty ulepszeń.
 */
function FormCard(props: { game: Game; stage: StageControls; line: CompiledLine; form: string }) {
  const { game, line, form } = props;
  const node = line.forms.get(form);
  const unit = game.content.heroes.get(form);
  if (node === undefined || unit === undefined) return null;
  const parent = node.from === null ? undefined : game.content.heroes.get(node.from);
  return (
    <section class="sheet form-card" data-details={form}>
      <header class="card-head">
        <Portrait stage={props.stage} unit={form} />
        <div class="card-title">
          <h3 class="hero-name">{unitName(form)}</h3>
          <p class="hero-form">
            <span>{lineName(line.id)}</span>
            <span>{tierLabel(node.tier)}</span>
          </p>
        </div>
        {parent !== undefined && (
          <InfoButton topic={unitName(form)} lines={[t('heroes.compare')]} />
        )}
      </header>
      <p class="form-origin">
        <span>
          {node.from === null
            ? t('heroes.info.price')
            : t('heroes.from', { name: unitName(node.from) })}
        </span>
        <Gold amount={node.from === null ? line.price : node.evolveCost} />
      </p>
      <p class="form-next">
        {node.next.length === 0
          ? t('heroes.last')
          : t('heroes.into', { names: node.next.map((next) => unitName(next)).join(', ') })}
      </p>
      {/* Forma po ewolucji zaczyna bez ulepszeń, więc porównujemy wartości bazowe obu form. */}
      <StatTable spec={parent?.base ?? unit.base} next={parent === undefined ? null : unit.base} />
      <div class="form-upgrades">
        <span class="sheet-title">{t('heroes.upgrade.costs')}</span>
        <span class="form-upgrade-costs">
          {node.upgradeCosts.map((cost, step) => (
            <span key={`${step}:${cost}`} title={t('heroes.path.upgrade', { step: step + 1 })}>
              <Gold amount={cost} />
            </span>
          ))}
        </span>
      </div>
    </section>
  );
}

export function HeroesScreen(props: {
  game: Game;
  stage: StageControls;
  line: string | null;
  form: string | null;
}) {
  const { game, stage } = props;
  const { content } = game;
  const line = props.line === null ? undefined : content.lines.get(props.line);
  const form = line === undefined ? null : (props.form ?? line.base);
  const stands = line === undefined ? [] : formStands(content, line.id, form);
  const { maxUpgrades, upgradePercent } = content.progression;

  return (
    <div class="screen heroes">
      <ScreenHead
        game={game}
        title={t('nav.heroes')}
        info={[
          t('heroes.info.upgrade', { percent: upgradePercent }),
          t('heroes.info.evolve', { max: maxUpgrades }),
          t('heroes.info.where'),
        ]}
      />
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
            {lineName(option.id)}
          </button>
        ))}
      </nav>

      {line !== undefined && form !== null && (
        <>
          <section class="sheet tree-sheet">
            <Tree game={game} stage={stage} line={line} form={form} />
          </section>

          <FormCard game={game} stage={stage} line={line} form={form} />

          {/* Pod podłogą droga wybranej formy: nazwy postaci i koszty ewolucji między nimi. */}
          {stands.map((stand, index) => {
            const node = line.forms.get(stand.unitId);
            const previous = stands[index - 1];
            return (
              <div key={stand.unitId}>
                {previous !== undefined && node !== undefined && (
                  <p
                    class="path-arrow"
                    style={{ left: `${((previous.position + stand.position) / 2) * 100}%` }}
                  >
                    <Gold amount={node.evolveCost} />
                  </p>
                )}
                <button
                  type="button"
                  class="path-name"
                  data-form={stand.unitId}
                  aria-pressed={stand.unitId === form}
                  style={{ left: `${stand.position * 100}%` }}
                  onClick={() => game.openHeroes(line.id, stand.unitId)}
                >
                  {unitName(stand.unitId)}
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
