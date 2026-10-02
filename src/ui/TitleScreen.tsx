// Ekran startowy: nazwa gry nad sceną, na której skład gracza stoi naprzeciw najbliższych
// przeciwników, i jeden przycisk prowadzący na mapę.
import { useEffect, useRef } from 'preact/hooks';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { gameVersion, versionLabel } from '../game/version.ts';
import { FangMark } from './icons.tsx';

export function TitleScreen(props: { game: Game }) {
  // Przycisk dostaje fokus, żeby Enter od razu zaczynał grę.
  const play = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    play.current?.focus();
  }, []);
  return (
    <div class="screen title">
      <header class="title-mark">
        <FangMark />
        <h1 class="title-name">{t('app.title')}</h1>
      </header>
      <div class="fight">
        <button
          ref={play}
          type="button"
          class="btn btn-primary btn-big"
          data-action="play"
          onClick={() => props.game.openMap()}
        >
          {t('title.play')}
        </button>
      </div>
      <p class="title-version">{t('app.version', { version: versionLabel(gameVersion) })}</p>
    </div>
  );
}
