// Wybór runy do gniazda bohatera: paleta wolnych run w okienku nad jego polem.
import type { Game } from '../game/game.ts';
import { runeStock } from '../game/hero-options.ts';
import { t } from '../game/i18n.ts';
import { runeLabel } from './common.tsx';
import { closeTo, type FieldAnchor, FieldPopup } from './FieldPopup.tsx';
import { RuneToken } from './HeroField.tsx';

export interface RunePick extends FieldAnchor {
  readonly kind: 'rune';
  readonly hero: number;
  readonly socket: number;
}

export function RunePicker(props: { game: Game; pick: RunePick; onClose: () => void }) {
  const { game, pick, onClose } = props;
  const save = game.save.value;
  const hero = save.heroes.find((candidate) => candidate.id === pick.hero);
  const current = hero?.runes[pick.socket] ?? null;
  const stock = runeStock(game.content, save);

  const equip = (rune: string | null): void => {
    game.equipRune(pick.hero, pick.socket, rune);
    closeTo(pick, onClose);
  };

  return (
    <FieldPopup
      anchor={pick}
      kind="rune-picker"
      label={t('runes.socket.title', { slot: pick.socket + 1 })}
      onClose={onClose}
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
    </FieldPopup>
  );
}
