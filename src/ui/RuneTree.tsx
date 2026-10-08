// Drzewko run w sklepie (ADR 0026): z pnia po lewej wychodzą kierunki, w każdym kolejne runy
// jednej statystyki, coraz mocniejsze i coraz większe. Kolorowe żetony to runy, które gracz już
// ma; następną w kierunku bierze się za żeton run, po kliknięciu i potwierdzeniu w okienku, bo
// żetonów jest mało, a wyboru nie da się cofnąć. Zasady są pod przyciskiem „i” przy tytule.
import { useSignal } from '@preact/signals';
import type { Rune } from '../content/load-progression.ts';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { type RuneNodeState, runeTreeView } from '../game/runes.ts';
import { RUNE_COLORS, RuneTokens, runeColor, runeLabel } from './common.tsx';
import { closeTo, type FieldAnchor, FieldPopup } from './FieldPopup.tsx';
import { InfoButton } from './InfoButton.tsx';

interface TakePick extends FieldAnchor {
  readonly rune: Rune;
}

const NODE_LABEL = {
  owned: 'runes.node.owned',
  next: 'runes.node.next',
  locked: 'runes.node.locked',
} as const satisfies Record<RuneNodeState, string>;

export function RuneTree(props: { game: Game }) {
  const { game } = props;
  const tree = runeTreeView(game.content, game.save.value);
  const pick = useSignal<TakePick | null>(null);
  const picking = pick.value;
  const close = (): void => {
    pick.value = null;
  };

  /** Otwiera potwierdzenie pod klikniętą runą; drugie kliknięcie tej samej runy je zamyka. */
  const choose = (rune: Rune, opener: HTMLElement): void => {
    if (picking?.rune === rune) {
      close();
      return;
    }
    const area = opener.closest('.screen')?.getBoundingClientRect();
    if (area === undefined || area.width === 0 || area.height === 0) return;
    const rect = opener.getBoundingClientRect();
    pick.value = {
      rune,
      opener,
      at: (rect.left + rect.width / 2 - area.left) / area.width,
      below: (rect.bottom - area.top) / area.height,
    };
  };

  return (
    <>
      <section class="sheet rune-tree" aria-label={t('runes.tree')}>
        <header class="rune-tree-head">
          <h3 class="sheet-title">{t('runes.tree')}</h3>
          <InfoButton
            topic={t('runes.tree')}
            lines={[
              t('runes.info.tokens'),
              t('runes.info.tree'),
              t('runes.info.equip'),
              t('runes.info.stats'),
            ]}
          />
        </header>
        {/* Zapas żetonów jest korzeniem drzewka: z niego wychodzi pień. */}
        <div class="rune-root">
          <RuneTokens count={tree.tokens} />
        </div>
        <ul class="rune-branches">
          {tree.branches.map(({ branch, nodes }) => (
            <li key={branch.id} class="rune-branch" data-branch={branch.id}>
              <span class={`rune-branch-name ${RUNE_COLORS[branch.stat]}`}>
                {t(`stat.${branch.stat}`)}
              </span>
              <ol class="rune-nodes">
                {nodes.map(({ rune, state }) => (
                  <li key={rune.id} class="rune-step" data-state={state}>
                    <button
                      type="button"
                      class={
                        state === 'owned'
                          ? `rune-node rune-token ${runeColor(rune)}`
                          : state === 'next' && tree.tokens > 0
                            ? `rune-node rune-node-open rune-token ${runeColor(rune)}`
                            : 'rune-node rune-token'
                      }
                      style={{ '--depth': `${rune.depth}` }}
                      data-rune={rune.id}
                      data-state={state}
                      disabled={state !== 'next' || tree.tokens === 0}
                      aria-label={t(NODE_LABEL[state], { rune: runeLabel(rune) })}
                      aria-expanded={state === 'next' ? picking?.rune === rune : undefined}
                      title={runeLabel(rune)}
                      onClick={(event) => choose(rune, event.currentTarget)}
                    >
                      +{rune.value}
                    </button>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </section>

      {picking !== null && (
        <FieldPopup
          key={picking.rune.id}
          anchor={picking}
          kind="rune-take"
          label={runeLabel(picking.rune)}
          onClose={close}
        >
          <p class="sheet-title">{runeLabel(picking.rune)}</p>
          <button
            type="button"
            class="btn btn-primary btn-small"
            data-action="take-rune"
            aria-label={t('runes.take.label', { rune: runeLabel(picking.rune) })}
            onClick={() => {
              game.unlockRune(picking.rune.id);
              closeTo(picking, close);
            }}
          >
            {t('runes.take')}
            <RuneTokens count={1} />
          </button>
        </FieldPopup>
      )}
    </>
  );
}
