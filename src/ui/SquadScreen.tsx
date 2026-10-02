// Zarządzanie składem: ustawianie bohaterów na slotach oraz ulepszenia, ewolucja i runy
// wybranego bohatera. Bohatera łapie się wprost na scenie: postać jedzie za wskaźnikiem po linii
// podłogi, a upuszczona na innym slocie zamienia się miejscami z tym, kto tam stoi.
import { useSignal } from '@preact/signals';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { StageControls } from '../game/battle-stage.ts';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { heroView, isSquadEmpty } from '../game/progress.ts';
import { SQUAD_SLOTS } from '../game/save-schema.ts';
import { ScreenHead } from './common.tsx';
import { createDrag } from './drag.ts';
import { HeroDetails, heroLabel } from './HeroDetails.tsx';
import { FANG_PATH } from './icons.tsx';

const BENCH = 'bench';
const SLOT_PREFIX = 'slot:';
const SLOTS = Array.from({ length: SQUAD_SLOTS }, (_, slot) => slot);

export function SquadScreen(props: { game: Game; stage: StageControls }) {
  const { game, stage } = props;
  const { content } = game;
  const { arena } = content;
  const save = game.save.value;
  const selected = useSignal<number | null>(save.squad.find((id) => id !== null) ?? null);
  const screen = useRef<HTMLDivElement>(null);
  /** Bohater przesunięty z klawiatury: po przerysowaniu jego przycisk ma odzyskać fokus. */
  const refocus = useRef<number | null>(null);

  // Sloty od lewej do prawej, tak jak stoją na scenie (front składu jest po prawej).
  const visualOrder = useMemo(
    () => [...SLOTS].sort((a, b) => (arena.playerSlots[a] ?? 0) - (arena.playerSlots[b] ?? 0)),
    [arena],
  );

  // Przeciągany element to id bohatera zapisane jako tekst.
  const drag = useMemo(
    () =>
      createDrag({
        onClick: (item) => {
          selected.value = Number(item);
        },
        // Bohater ze składu jedzie po scenie za wskaźnikiem; ten spoza składu ma tylko etykietę.
        onMove: (item, x) => {
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
    [game, stage, selected],
  );

  useEffect(() => {
    const hero = refocus.current;
    if (hero === null) return;
    refocus.current = null;
    screen.current?.querySelector<HTMLElement>(`.stage-hero[data-hero="${hero}"]`)?.focus();
  });

  /** Klawiatura: strzałki przestawiają bohatera na sąsiedni slot. */
  const moveBy = (heroId: number, slot: number, step: number): void => {
    const next = visualOrder[visualOrder.indexOf(slot) + step];
    if (next === undefined) return;
    refocus.current = heroId;
    selected.value = heroId;
    game.placeInSquad(heroId, next);
  };

  const bench = save.heroes.filter((hero) => !save.squad.includes(hero.id));
  const selectedId = selected.value;
  const selectedView = selectedId === null ? null : heroView(content, save, selectedId);
  const dragging = drag.state.value;
  const draggedView = dragging === null ? null : heroView(content, save, Number(dragging.item));
  const over = dragging?.over ?? null;

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
      </section>

      <section class="sheet hero-sheet">
        {selectedView === null ? (
          <p class="note">{t('squad.details.none')}</p>
        ) : (
          <HeroDetails game={game} view={selectedView} />
        )}
      </section>

      {visualOrder.map((slot) => {
        const heroId = save.squad[slot] ?? null;
        const view = heroId === null ? null : heroView(content, save, heroId);
        const target = `${SLOT_PREFIX}${slot}`;
        const label = t(slot === 0 ? 'squad.slot.front' : 'squad.slot', { slot: slot + 1 });
        const classes = [
          'slot',
          view === null ? 'slot-empty' : '',
          heroId !== null && heroId === selectedId ? 'slot-selected' : '',
          over === target ? 'slot-over' : '',
        ];
        return (
          <div
            key={slot}
            class={classes.filter((name) => name !== '').join(' ')}
            data-drop={target}
            style={{ left: `${((arena.playerSlots[slot] ?? 0) / arena.width) * 100}%` }}
          >
            <svg class="slot-fang" viewBox="0 0 40 52" aria-hidden="true">
              <path d={FANG_PATH} />
            </svg>
            <span class="slot-number" aria-hidden="true">
              {slot + 1}
            </span>
            {heroId !== null && view !== null ? (
              // Cała postać na scenie jest uchwytem: kliknięcie wybiera, przeciągnięcie przestawia.
              <button
                type="button"
                class="stage-hero"
                data-hero={heroId}
                aria-pressed={selectedId === heroId}
                title={label}
                onPointerDown={(event) => drag.start(event, String(heroId))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') selected.value = heroId;
                  else if (event.key === 'ArrowLeft') moveBy(heroId, slot, -1);
                  else if (event.key === 'ArrowRight') moveBy(heroId, slot, 1);
                }}
              >
                <span class="hero-tag">{heroLabel(view)}</span>
              </button>
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
              />
            )}
          </div>
        );
      })}

      <p class="squad-hint">{t(isSquadEmpty(save) ? 'squad.empty' : 'squad.hint')}</p>

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
