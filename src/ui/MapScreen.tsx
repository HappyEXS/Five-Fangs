// Mapa poziomów: światy po kolei, poziomy odblokowywane jeden po drugim.
import { levelNameKey, worldNameKey } from '../content/i18n/keys.ts';
import type { Game } from '../game/game.ts';
import { t, tName } from '../game/i18n.ts';
import { isLevelCleared, isLevelUnlocked } from '../game/progress.ts';
import { runeLabel, TopBar } from './common.tsx';

export function MapScreen(props: { game: Game }) {
  const { game } = props;
  const { content } = game;
  const save = game.save.value;
  return (
    <div class="screen map">
      <TopBar game={game} title={t('map.title')} onBack={() => game.go({ name: 'menu' })}>
        <button
          type="button"
          class="button"
          onClick={() => game.go({ name: 'heroes', back: { name: 'map' } })}
        >
          {t('heroes.title')}
        </button>
      </TopBar>
      <div class="worlds">
        {content.worlds.map((world) => (
          <section class="world panel" key={world.id}>
            <h3>{tName(worldNameKey(world.id))}</h3>
            <ol class="levels">
              {world.levels.map((id, index) => {
                const level = content.levels.get(id);
                if (level === undefined) return null;
                const unlocked = isLevelUnlocked(content, save, id);
                const cleared = isLevelCleared(save, id);
                const rune = level.rune === null ? undefined : content.runes.get(level.rune);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      class={`level${cleared ? ' level-cleared' : ''}`}
                      data-level={id}
                      disabled={!unlocked}
                      onClick={() => game.openLevel(id)}
                    >
                      <span class="level-number">{index + 1}</span>
                      <span class="level-name">{tName(levelNameKey(id))}</span>
                      <span class="level-state">
                        {!unlocked
                          ? t('map.level.locked')
                          : cleared
                            ? t('map.level.cleared')
                            : t('map.reward.gold', { gold: level.gold })}
                      </span>
                      {/* Runa jest nagrodą tylko za pierwsze przejście. */}
                      {rune !== undefined && !cleared && (
                        <span class="level-rune">{runeLabel(rune)}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
