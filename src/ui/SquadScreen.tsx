// Zarządzanie składem: ustawianie bohaterów na slotach oraz ulepszenia, ewolucja i runy
// wybranego bohatera. Pod interfejsem canvas pokazuje skład stojący na swoich slotach;
// strefy slotów leżą w jednym rzędzie pod bohaterami.
import { useSignal } from '@preact/signals';
import { useMemo } from 'preact/hooks';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { heroView, isSquadEmpty } from '../game/progress.ts';
import { SQUAD_SLOTS } from '../game/save-schema.ts';
import { TopBar } from './common.tsx';
import { createDrag } from './drag.ts';
import { HeroDetails, heroLabel } from './HeroDetails.tsx';

const BENCH = 'bench';
const SLOT_PREFIX = 'slot:';
const SLOTS = Array.from({ length: SQUAD_SLOTS }, (_, slot) => slot);

export function SquadScreen(props: { game: Game }) {
  const { game } = props;
  const { content } = game;
  const save = game.save.value;
  const selected = useSignal<number | null>(save.squad.find((id) => id !== null) ?? null);

  // Przeciągany element to id bohatera zapisane jako tekst.
  const drag = useMemo(
    () =>
      createDrag({
        onClick: (item) => {
          selected.value = Number(item);
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
    [game, selected],
  );

  const chip = (heroId: number) => {
    const view = heroView(content, save, heroId);
    if (view === null) return null;
    return (
      <button
        type="button"
        key={heroId}
        class="hero-chip"
        data-hero={heroId}
        data-line={view.hero.line}
        aria-pressed={selected.value === heroId}
        onPointerDown={(event) => drag.start(event, String(heroId))}
        // Klawiatura nie wysyła zdarzeń wskaźnika; Enter i spacja wybierają bohatera.
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') selected.value = heroId;
        }}
      >
        {heroLabel(view)}
      </button>
    );
  };

  const bench = save.heroes.filter((hero) => !save.squad.includes(hero.id));
  const selectedId = selected.value;
  const selectedView = selectedId === null ? null : heroView(content, save, selectedId);
  const dragging = drag.state.value;
  const draggedView = dragging === null ? null : heroView(content, save, Number(dragging.item));

  return (
    <div class="screen squad">
      <TopBar game={game} title={t('hub.squad')} onBack={() => game.go({ name: 'hub' })}>
        <button type="button" class="button" onClick={() => game.go({ name: 'shop' })}>
          {t('hub.shop')}
        </button>
        <button type="button" class="button" onClick={() => game.openMap()}>
          {t('hub.map')}
        </button>
      </TopBar>

      <section class="panel squad-bench" data-drop={BENCH}>
        <h3>{t('squad.bench')}</h3>
        {bench.length === 0 ? (
          <p class="dim">{t('squad.bench.empty')}</p>
        ) : (
          <div class="chips">{bench.map((hero) => chip(hero.id))}</div>
        )}
        <p class="dim">{t(isSquadEmpty(save) ? 'squad.empty' : 'squad.hint')}</p>
      </section>

      <section class="panel squad-details">
        {selectedView === null ? (
          <p class="dim">{t('squad.details.none')}</p>
        ) : (
          <HeroDetails game={game} view={selectedView} />
        )}
      </section>

      {SLOTS.map((slot) => {
        const heroId = save.squad[slot] ?? null;
        const left = ((content.arena.playerSlots[slot] ?? 0) / content.arena.width) * 100;
        return (
          <div
            key={slot}
            class="slot"
            data-drop={`${SLOT_PREFIX}${slot}`}
            style={{ left: `${left}%` }}
          >
            {/* Etykieta slotu jest przyciskiem: stawia wybranego bohatera bez przeciągania. */}
            <button
              type="button"
              class="slot-label"
              title={t(slot === 0 ? 'squad.slot.front' : 'squad.slot', { slot: slot + 1 })}
              disabled={selectedId === null || selectedId === heroId}
              onClick={() => {
                if (selectedId !== null) game.placeInSquad(selectedId, slot);
              }}
            >
              {slot + 1}
            </button>
            {heroId !== null && chip(heroId)}
          </div>
        );
      })}

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
