// Wybór drogi ewolucji: gdy z bieżącej formy wychodzi kilka dróg (ADR 0016), przycisk zakupu
// otwiera okienko z każdą z nich: miniaturka i nazwa formy, najważniejsze statystyki po ewolucji
// i zakup.
import type { StageControls } from '../game/battle-stage.ts';
import type { Game } from '../game/game.ts';
import { nextPurchase } from '../game/hero-options.ts';
import { t } from '../game/i18n.ts';
import { heroView } from '../game/progress.ts';
import { Gold, StatTable, unitName } from './common.tsx';
import { closeTo, type FieldAnchor, FieldPopup } from './FieldPopup.tsx';
import { Portrait } from './Portrait.tsx';

export interface EvolvePick extends FieldAnchor {
  readonly kind: 'evolve';
  readonly hero: number;
}

/** Statystyki, które najlepiej odróżniają drogi; pełne są na karcie i w zakładce Bohaterowie. */
const KEY_STATS = ['stat.maxHp', 'stat.attack', 'stat.dps', 'stat.range'] as const;

export function EvolvePicker(props: {
  game: Game;
  stage: StageControls;
  pick: EvolvePick;
  onClose: () => void;
}) {
  const { game, pick, onClose } = props;
  const save = game.save.value;
  const view = heroView(game.content, save, pick.hero);
  const purchase = nextPurchase(game.content, save, pick.hero);
  if (view === null || purchase === null || purchase.kind !== 'evolve') return null;

  return (
    <FieldPopup anchor={pick} kind="evolve-picker" label={t('evolve.pick')} onClose={onClose}>
      <p class="sheet-title">{t('evolve.pick')}</p>
      <ul class="evolve-options">
        {purchase.options.map((option) => (
          <li key={option.unitId} class="evolve-option" data-form={option.unitId}>
            <header class="evolve-head">
              <Portrait stage={props.stage} unit={option.unitId} />
              <h3 class="evolve-name">{unitName(option.unitId)}</h3>
            </header>
            <StatTable spec={view.spec} next={option.spec} rows={KEY_STATS} />
            <button
              type="button"
              class="btn btn-primary btn-small"
              data-action="evolve"
              disabled={save.gold < option.cost}
              aria-label={t('heroes.evolve.buy', {
                name: unitName(option.unitId),
                cost: option.cost,
              })}
              onClick={() => {
                game.evolve(pick.hero, option.unitId);
                closeTo(pick, onClose);
              }}
            >
              {t('shop.buy')}
              <Gold amount={option.cost} />
            </button>
          </li>
        ))}
      </ul>
      <p class="note">{t('evolve.more')}</p>
    </FieldPopup>
  );
}
