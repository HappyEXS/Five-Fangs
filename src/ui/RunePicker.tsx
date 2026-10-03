// Wybór runy do gniazda bohatera: okienko nad jego polem z wolnymi runami. Zamyka się po
// wyborze, Escape albo kliknięciu poza okienkiem; fokus wraca do gniazda.
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { Game } from '../game/game.ts';
import { runeStock } from '../game/hero-options.ts';
import { t } from '../game/i18n.ts';
import { runeLabel } from './common.tsx';
import { RuneToken } from './HeroField.tsx';

export interface RunePick {
  readonly hero: number;
  readonly socket: number;
  /** Środek pola bohatera jako ułamek szerokości sceny. */
  readonly at: number;
  /** Przycisk gniazda, do którego wraca fokus. */
  readonly opener: HTMLElement;
}

export function RunePicker(props: { game: Game; pick: RunePick; onClose: () => void }) {
  const { game, pick, onClose } = props;
  const save = game.save.value;
  const hero = save.heroes.find((candidate) => candidate.id === pick.hero);
  const current = hero?.runes[pick.socket] ?? null;
  const stock = runeStock(game.content, save);
  const box = useRef<HTMLDivElement>(null);

  // Nasłuch zakładamy synchronicznie po wstawieniu okienka: Escape wciśnięty tuż po otwarciu
  // też je zamyka.
  useLayoutEffect(() => {
    box.current?.querySelector<HTMLElement>('button')?.focus();
    const close = (): void => {
      onClose();
      if (pick.opener.isConnected) pick.opener.focus();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && box.current?.contains(target) === true) return;
      // Kliknięcie w to samo gniazdo obsługuje samo gniazdo: zamknięcie tutaj otwarłoby je od nowa.
      if (target instanceof Node && pick.opener.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [pick, onClose]);

  const equip = (rune: string | null): void => {
    game.equipRune(pick.hero, pick.socket, rune);
    onClose();
    if (pick.opener.isConnected) pick.opener.focus();
  };

  return (
    <div
      ref={box}
      class="sheet rune-picker"
      role="dialog"
      aria-label={t('runes.socket.title', { slot: pick.socket + 1 })}
      style={{ left: `clamp(9em, ${pick.at * 100}%, 100% - 9em)` }}
    >
      <p class="sheet-title">{t('runes.pick')}</p>
      {stock.length === 0 ? (
        <p class="note">{t('runes.none')}</p>
      ) : (
        <ul class="rune-options">
          {stock.map(({ rune, count }) => (
            <li key={rune.id}>
              {/* Paleta żetonów: kolor mówi, co runa wzmacnia, napis o ile; licznik, ile takich jest. */}
              <button
                type="button"
                class="rune-option"
                data-rune={rune.id}
                title={runeLabel(rune)}
                aria-label={
                  count > 1 ? `${runeLabel(rune)} ${t('runes.count', { count })}` : runeLabel(rune)
                }
                onClick={() => equip(rune.id)}
              >
                <RuneToken rune={rune} />
                <span class="rune-option-stat">
                  {t(rune.stat === 'maxHp' ? 'stat.maxHp' : 'stat.attack')}
                </span>
                {count > 1 && <span class="rune-option-count">{t('runes.count', { count })}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {current !== null && (
        <button
          type="button"
          class="btn btn-small"
          data-action="unequip"
          onClick={() => equip(null)}
        >
          {t('heroes.rune.remove')}
        </button>
      )}
    </div>
  );
}
