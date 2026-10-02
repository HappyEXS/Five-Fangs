// Korzeń interfejsu: ekran bieżącej sceny i komunikaty niezależne od sceny.
import type { StageControls } from '../game/battle-stage.ts';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { reloadGame } from '../game/update.ts';
import { BattleHud, ResultScreen } from './BattleScreens.tsx';
import { Hub } from './Hub.tsx';
import { LoadFailureBanner } from './LoadFailureBanner.tsx';
import { MapScreen } from './MapScreen.tsx';
import { ShopScreen } from './ShopScreen.tsx';
import { SquadScreen } from './SquadScreen.tsx';

export interface AppProps {
  readonly game: Game;
  readonly stage: StageControls;
}

function SceneView(props: AppProps) {
  const { game, stage } = props;
  const scene = game.scene.value;
  switch (scene.name) {
    case 'hub':
      return <Hub game={game} />;
    case 'map':
      return <MapScreen game={game} selected={scene.selected} />;
    case 'squad':
      return <SquadScreen game={game} />;
    case 'shop':
      return <ShopScreen game={game} />;
    case 'battle':
      return <BattleHud game={game} stage={stage} level={scene.level} />;
    case 'result':
      return (
        <ResultScreen
          game={game}
          level={scene.level}
          battle={scene.battle}
          rewards={scene.rewards}
        />
      );
  }
}

export function App(props: AppProps) {
  const { game } = props;
  const storage = game.storage.value;

  // Zapis z nowszej wersji gry: nie gramy na nim i go nie nadpisujemy (ADR 0005).
  if (storage === 'blocked') {
    return (
      <div class="screen">
        <section class="panel notice-blocking" role="alert">
          <h2>{t('notice.blocked.title')}</h2>
          <p>{t('notice.blocked.text')}</p>
          <button type="button" class="button button-primary" onClick={() => reloadGame()}>
            {t('update.reload')}
          </button>
        </section>
      </div>
    );
  }

  return (
    <>
      <SceneView {...props} />
      <LoadFailureBanner />
      {game.recovered.value && (
        <div class="banner banner-bottom" role="alert">
          <span>{t('notice.recovered')}</span>
          <button
            type="button"
            class="banner-action"
            onClick={() => {
              game.recovered.value = false;
            }}
          >
            {t('common.ok')}
          </button>
        </div>
      )}
      {storage === 'memory' && game.scene.value.name === 'hub' && (
        <div class="banner banner-bottom" role="status">
          <span>{t('notice.memory')}</span>
        </div>
      )}
    </>
  );
}
