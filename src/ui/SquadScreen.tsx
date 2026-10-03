// Zarządzanie składem. Każdy bohater ma na scenie swoje pole: nad nim gniazda run, pod nim
// pasek ulepszeń i przycisk zakupu. Bohatera łapie się wprost za postać: jedzie za wskaźnikiem
// po linii podłogi, a upuszczony na innym slocie zamienia się miejscami z tym, kto tam stoi.
// Karta z prawej tylko pokazuje statystyki wybranego bohatera.
import { useSignal } from '@preact/signals';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';
import type { StageControls } from '../game/battle-stage.ts';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { heroView, isSquadEmpty } from '../game/progress.ts';
import { SQUAD_SLOTS } from '../game/save-schema.ts';
import { SQUAD_FIELD_AT } from '../game/stage-stands.ts';
import { ScreenHead } from './common.tsx';
import { createDrag } from './drag.ts';
import { HeroCard, heroLabel } from './HeroCard.tsx';
import { BuyButton, RuneSockets, UpgradeBar } from './HeroField.tsx';
import { FANG_PATH } from './icons.tsx';
import { type RunePick, RunePicker } from './RunePicker.tsx';

const BENCH = 'bench';
const SLOT_PREFIX = 'slot:';
const SLOTS = Array.from({ length: SQUAD_SLOTS }, (_, slot) => slot);
/** Pola od lewej do prawej, tak jak stoją na scenie (front składu jest po prawej). */
const VISUAL_ORDER = [...SLOTS].sort((a, b) => (SQUAD_FIELD_AT[a] ?? 0) - (SQUAD_FIELD_AT[b] ?? 0));

function fieldAt(slot: number): number {
  return SQUAD_FIELD_AT[slot] ?? 0;
}

export function SquadScreen(props: { game: Game; stage: StageControls }) {
  const { game, stage } = props;
  const { content } = game;
  const save = game.save.value;
  const selected = useSignal<number | null>(save.squad.find((id) => id !== null) ?? null);
  const pick = useSignal<RunePick | null>(null);
  const screen = useRef<HTMLDivElement>(null);
  /** Bohater przesunięty z klawiatury: po przerysowaniu jego uchwyt ma odzyskać fokus. */
  const refocus = useRef<number | null>(null);
  const closePick = useCallback(() => {
    pick.value = null;
  }, [pick]);

  // Przeciągany element to id bohatera zapisane jako tekst.
  const drag = useMemo(
    () =>
      createDrag({
        onClick: (item) => {
          selected.value = Number(item);
        },
        // Bohater ze składu jedzie po scenie za wskaźnikiem; ten spoza składu ma tylko etykietę.
        onMove: (item, x) => {
          pick.value = null;
          const slot = game.save.value.squad.indexOf(Number(item));
          const rect = screen.current?.getBoundingClientRect();
          if (slot < 0 || rect === undefined || rect.width === 0) return;
          stage.movePreviewUnit(slot, (x - rect.left) / rect.width);
        },
        onEnd: (item) => {
          const slot = game.save.value.squad.indexOf(Number(item));
          if (slot >= 0) stage.movePreviewUnit(slot, null);
        },
        onDrop: (item, target) => {
          const hero = Number(item);
          selected.value = hero;
          if (target === BENCH) {
            const slot = game.save.value.squad.indexOf(hero);
            if (slot >= 0) game.removeFromSquad(slot);
          } else if (target.startsWith(SLOT_PREFIX)) {
            game.placeInSquad(hero, Number(target.slice(SLOT_PREFIX.length)));
          }
        },
      }),
    [game, stage, selected, pick],
  );

  useEffect(() => {
    const hero = refocus.current;
    if (hero === null) return;
    refocus.current = null;
    screen.current?.querySelector<HTMLElement>(`.stage-hero[data-hero="${hero}"]`)?.focus();
  });

  /** Klawiatura: strzałki przestawiają bohatera na sąsiedni slot, Delete zdejmuje go ze składu. */
  const onHandleKey = (event: KeyboardEvent, heroId: number, slot: number): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      selected.value = heroId;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const next = VISUAL_ORDER[VISUAL_ORDER.indexOf(slot) + (event.key === 'ArrowLeft' ? -1 : 1)];
      if (next === undefined) return;
      refocus.current = heroId;
      selected.value = heroId;
      game.placeInSquad(heroId, next);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      selected.value = heroId;
      game.removeFromSquad(slot);
    }
  };

  const bench = save.heroes.filter((hero) => !save.squad.includes(hero.id));
  const selectedId = selected.value;
  const selectedView = selectedId === null ? null : heroView(content, save, selectedId);
  const dragging = drag.state.value;
  const draggedView = dragging === null ? null : heroView(content, save, Number(dragging.item));
  const over = dragging?.over ?? null;
  const picking = pick.value;

  return (
    <div ref={screen} class="screen squad">
      <ScreenHead game={game} title={t('nav.squad')} />

      <section class={over === BENCH ? 'sheet reserve is-over' : 'sheet reserve'} data-drop={BENCH}>
        <h3 class="sheet-title">{t('squad.bench')}</h3>
        {bench.length === 0 ? (
          <p class="note">{t('squad.bench.empty')}</p>
        ) : (
          <div class="chips">
            {bench.map((hero) => {
              const view = heroView(content, save, hero.id);
              return view === null ? null : (
                <button
                  type="button"
                  key={hero.id}
                  class="hero-chip"
                  data-hero={hero.id}
                  aria-pressed={selectedId === hero.id}
                  onPointerDown={(event) => drag.start(event, String(hero.id))}
                  // Klawiatura nie wysyła zdarzeń wskaźnika; Enter i spacja wybierają bohatera.
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') selected.value = hero.id;
                  }}
                >
                  {heroLabel(view)}
                </button>
              );
            })}
          </div>
        )}
        <p class="note">{t(isSquadEmpty(save) ? 'squad.empty' : 'squad.hint')}</p>
      </section>

      <section class="sheet hero-sheet">
        {selectedView === null ? (
          <p class="note">{t('squad.details.none')}</p>
        ) : (
          <HeroCard game={game} view={selectedView} />
        )}
      </section>

      {VISUAL_ORDER.map((slot) => {
        const heroId = save.squad[slot] ?? null;
        const view = heroId === null ? null : heroView(content, save, heroId);
        const target = `${SLOT_PREFIX}${slot}`;
        const label = t(slot === 0 ? 'squad.slot.front' : 'squad.slot', { slot: slot + 1 });
        const classes = [
          'field',
          view === null ? 'field-empty' : '',
          heroId !== null && heroId === selectedId ? 'field-selected' : '',
          over === target ? 'field-over' : '',
        ];
        const fang = (
          <>
            <svg class="slot-fang" viewBox="0 0 40 52" aria-hidden="true">
              <path d={FANG_PATH} />
            </svg>
            <span class="slot-number" aria-hidden="true">
              {slot + 1}
            </span>
          </>
        );
        return (
          <div
            key={slot}
            class={classes.filter((name) => name !== '').join(' ')}
            data-drop={target}
            style={{ left: `${fieldAt(slot) * 100}%` }}
          >
            {heroId !== null && view !== null ? (
              <>
                {/* Postać z nazwą i kłem jest uchwytem: kliknięcie wybiera, przeciągnięcie przestawia. */}
                <button
                  type="button"
                  class="stage-hero"
                  data-hero={heroId}
                  aria-pressed={selectedId === heroId}
                  title={label}
                  onPointerDown={(event) => drag.start(event, String(heroId))}
                  onKeyDown={(event) => onHandleKey(event, heroId, slot)}
                >
                  <span class="field-name">{heroLabel(view)}</span>
                  {fang}
                </button>
                <RuneSockets
                  game={game}
                  view={view}
                  onPick={(socket, opener) => {
                    selected.value = heroId;
                    const open = picking?.hero === heroId && picking.socket === socket;
                    pick.value = open ? null : { hero: heroId, socket, at: fieldAt(slot), opener };
                  }}
                />
                <div class="field-foot">
                  <UpgradeBar game={game} view={view} />
                  <BuyButton
                    game={game}
                    view={view}
                    onBuy={() => {
                      selected.value = heroId;
                    }}
                  />
                </div>
              </>
            ) : (
              // Pusty slot przyjmuje wybranego bohatera także kliknięciem, bez przeciągania.
              <button
                type="button"
                class="slot-place"
                title={label}
                aria-label={t('squad.slot.place', { slot: slot + 1 })}
                disabled={selectedId === null}
                onClick={() => {
                  if (selectedId !== null) game.placeInSquad(selectedId, slot);
                }}
              >
                {fang}
              </button>
            )}
          </div>
        );
      })}

      {picking !== null && <RunePicker game={game} pick={picking} onClose={closePick} />}

      {dragging !== null && draggedView !== null && (
        <div
          class="hero-chip drag-ghost"
          style={{ left: `${dragging.x}px`, top: `${dragging.y}px` }}
        >
          {heroLabel(draggedView)}
        </div>
      )}
    </div>
  );
}
