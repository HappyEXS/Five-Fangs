// Budowanie składu przed walką. Pod interfejsem canvas pokazuje obie drużyny na ich slotach;
// strefy slotów leżą pod bohaterami, więc przeciąga się „na pole walki”.
import { useSignal } from '@preact/signals';
import { useMemo } from 'preact/hooks';
import { levelNameKey } from '../content/i18n/keys.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { isSquadEmpty, lineView } from '../game/progress.ts';
import { SQUAD_SLOTS } from '../game/save-schema.ts';
import { StatTable, TopBar, unitName } from './common.tsx';
import { createDrag } from './drag.ts';

const BENCH = 'bench';
const SLOT_PREFIX = 'slot:';
const SLOTS = Array.from({ length: SQUAD_SLOTS }, (_, slot) => slot);

export function SquadScreen(props: { game: Game; level: string }) {
  const { game, level } = props;
  const { content } = game;
  const save = game.save.value;
  const selected = useSignal<string | null>(save.squad.find((id) => id !== null) ?? null);

  const drag = useMemo(
    () =>
      createDrag({
        onClick: (line) => {
          selected.value = line;
        },
        onDrop: (line, target) => {
          selected.value = line;
          if (target === BENCH) {
            const slot = game.save.value.squad.indexOf(line);
            if (slot >= 0) game.removeFromSquad(slot);
          } else if (target.startsWith(SLOT_PREFIX)) {
            game.placeInSquad(line, Number(target.slice(SLOT_PREFIX.length)));
          }
        },
      }),
    [game, selected],
  );

  const chip = (line: string) => {
    const view = lineView(content, save, line);
    if (view === null) return null;
    return (
      <button
        type="button"
        class="hero-chip"
        data-line={line}
        aria-pressed={selected.value === line}
        onPointerDown={(event) => drag.start(event, line)}
        // Klawiatura nie wysyła zdarzeń wskaźnika; Enter i spacja wybierają bohatera.
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') selected.value = line;
        }}
      >
        {unitName(view.unitId)}
      </button>
    );
  };

  const bench = [...content.lines.keys()].filter(
    (line) => save.lines[line] !== undefined && !save.squad.includes(line),
  );
  const selectedLine = selected.value;
  const selectedView = selectedLine === null ? null : lineView(content, save, selectedLine);
  const selectedSlot = selectedLine === null ? -1 : save.squad.indexOf(selectedLine);
  const compiled = content.levels.get(level);
  const dragging = drag.state.value;
  const draggedView = dragging === null ? null : lineView(content, save, dragging.item);

  return (
    <div class="screen squad">
      <TopBar
        game={game}
        title={`${t('squad.title')}: ${tName(levelNameKey(level))}`}
        onBack={() => game.go({ name: 'map' })}
      >
        <button
          type="button"
          class="button"
          onClick={() => game.go({ name: 'heroes', back: { name: 'squad', level } })}
        >
          {t('heroes.title')}
        </button>
      </TopBar>

      <section class="panel squad-bench" data-drop={BENCH}>
        <h3>{t('squad.bench')}</h3>
        {bench.length === 0 ? (
          <p class="dim">{t('squad.bench.empty')}</p>
        ) : (
          <div class="chips">{bench.map(chip)}</div>
        )}
        {selectedView !== null && (
          <>
            <h3>{unitName(selectedView.unitId)}</h3>
            <StatTable spec={selectedView.spec} />
            {selectedSlot >= 0 && (
              <button
                type="button"
                class="button"
                onClick={() => game.removeFromSquad(selectedSlot)}
              >
                {t('squad.remove')}
              </button>
            )}
          </>
        )}
      </section>

      <section class="panel squad-enemies">
        <h3>{t('squad.enemies')}</h3>
        <ul>
          {compiled?.enemies.map((enemy) => (
            <li key={enemy.slot}>
              {unitName(enemy.unit)}{' '}
              <span class="dim">{t('squad.enemy.level', { level: enemy.level })}</span>
            </li>
          ))}
        </ul>
      </section>

      {SLOTS.map((slot) => {
        const line = save.squad[slot] ?? null;
        const left = ((content.arena.playerSlots[slot] ?? 0) / content.arena.width) * 100;
        return (
          <div
            key={slot}
            // Sloty leżą co 6% szerokości sceny; co drugi jest niżej, żeby zmieściły się nazwy.
            class={slot % 2 === 1 ? 'slot slot-low' : 'slot'}
            data-drop={`${SLOT_PREFIX}${slot}`}
            style={{ left: `${left}%` }}
          >
            {/* Etykieta slotu jest przyciskiem: stawia wybranego bohatera bez przeciągania. */}
            <button
              type="button"
              class="slot-label"
              disabled={selectedLine === null || selectedLine === line}
              onClick={() => {
                if (selectedLine !== null) game.placeInSquad(selectedLine, slot);
              }}
            >
              {t(slot === 0 ? 'squad.slot.front' : 'squad.slot', { slot: slot + 1 })}
            </button>
            {line !== null && chip(line)}
          </div>
        );
      })}

      <footer class="squad-footer">
        <span class="dim">{t(isSquadEmpty(save) ? 'squad.empty' : 'squad.hint')}</span>
        <button
          type="button"
          class="button button-primary"
          data-action="fight"
          disabled={isSquadEmpty(save)}
          onClick={() => game.startBattle(level)}
        >
          {t('squad.fight')}
        </button>
      </footer>

      {dragging !== null && draggedView !== null && (
        <div
          class="hero-chip drag-ghost"
          style={{ left: `${dragging.x}px`, top: `${dragging.y}px` }}
        >
          {unitName(draggedView.unitId)}
        </div>
      )}
    </div>
  );
}
