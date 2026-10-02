// Panel główny: stąd gracz idzie na mapę, do składu i do sklepu. Ustawienia otwierają się
// w miejscu kafli.
import { useSignal } from '@preact/signals';
import { levelNameKey } from '../content/i18n/keys.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { currentLevel, isLevelCleared } from '../game/progress.ts';
import { SQUAD_SLOTS } from '../game/save-schema.ts';
import { gameVersion, versionLabel } from '../game/version.ts';
import { Settings } from './Settings.tsx';

export function Hub(props: { game: Game }) {
  const { game } = props;
  const save = game.save.value;
  const settings = useSignal(false);
  const next = currentLevel(game.content, save);
  const finished = next !== null && isLevelCleared(save, next);
  const fielded = save.squad.filter((id) => id !== null).length;

  return (
    <div class="screen hub">
      <h1 class="title">{t('app.title')}</h1>
      {settings.value ? (
        <Settings
          game={game}
          onClose={() => {
            settings.value = false;
          }}
        />
      ) : (
        <>
          <p class="gold hub-gold">{t('common.gold', { gold: save.gold })}</p>
          <nav class="hub-tiles">
            <button
              type="button"
              class="tile"
              data-tile="map"
              onClick={() => game.openMap(finished ? null : next)}
            >
              <span class="tile-title">{t('hub.map')}</span>
              <span class="tile-note">
                {next === null || finished
                  ? t('hub.map.done')
                  : t('hub.map.next', { level: tName(levelNameKey(next)) })}
              </span>
            </button>
            <button
              type="button"
              class="tile"
              data-tile="squad"
              onClick={() => game.go({ name: 'squad' })}
            >
              <span class="tile-title">{t('hub.squad')}</span>
              <span class="tile-note">
                {t('hub.squad.count', {
                  count: fielded,
                  max: SQUAD_SLOTS,
                  owned: save.heroes.length,
                })}
              </span>
            </button>
            <button
              type="button"
              class="tile"
              data-tile="shop"
              onClick={() => game.go({ name: 'shop' })}
            >
              <span class="tile-title">{t('hub.shop')}</span>
              <span class="tile-note">{t('hub.shop.note')}</span>
            </button>
          </nav>
          <button
            type="button"
            class="button"
            onClick={() => {
              settings.value = true;
            }}
          >
            {t('menu.settings')}
          </button>
        </>
      )}
      <footer class="version">{t('app.version', { version: versionLabel(gameVersion) })}</footer>
    </div>
  );
}
