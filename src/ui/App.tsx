// Korzeń interfejsu: ekran bieżącej sceny, brama oddzielająca walkę od reszty gry i komunikaty
// niezależne od sceny.
import { effect } from '@preact/signals';
import { useEffect, useMemo } from 'preact/hooks';
import type { StageControls } from '../game/battle-stage.ts';
import type { Game } from '../game/game.ts';
import { t } from '../game/i18n.ts';
import { reloadGame } from '../game/update.ts';
import { BattleHud, ResultScreen } from './BattleScreens.tsx';
import { createGateMotion, type GateParts, GateView } from './Gate.tsx';
import { createGate, type Gate } from './gate.ts';
import { HeroesScreen } from './HeroesScreen.tsx';
import { LoadFailureBanner } from './LoadFailureBanner.tsx';
import { MapScreen } from './MapScreen.tsx';
import { PaperDefs } from './PaperDefs.tsx';
import { ShopScreen } from './ShopScreen.tsx';
import { SquadScreen } from './SquadScreen.tsx';
import { TitleScreen } from './TitleScreen.tsx';

export interface AppProps {
  readonly game: Game;
  readonly stage: StageControls;
}

function SceneView(props: AppProps & { gate: Gate }) {
  const { game, stage, gate } = props;
  const scene = game.scene.value;
  switch (scene.name) {
    case 'title':
      return <TitleScreen game={game} gate={gate} />;
    case 'map':
      return <MapScreen game={game} gate={gate} selected={scene.selected} />;
    case 'squad':
      return <SquadScreen game={game} stage={stage} />;
    case 'heroes':
      return <HeroesScreen game={game} line={scene.line} form={scene.form} />;
    case 'shop':
      return <ShopScreen game={game} />;
    case 'battle':
      return <BattleHud game={game} gate={gate} stage={stage} level={scene.level} />;
    case 'result':
      // Wynik wisi na zamkniętej bramie (warstwa nad nią); pod bramą zostaje pole walki.
      return null;
  }
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function App(props: AppProps) {
  const { game, stage } = props;
  const storage = game.storage.value;

  const { gate, parts } = useMemo(() => {
    const gateParts: GateParts = { root: null, left: null, right: null, bolts: null };
    const created = createGate({
      motion: createGateMotion(gateParts),
      reducedMotion,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    });
    return { gate: created, parts: gateParts };
  }, []);

  // Brama reaguje też na zmiany sceny spoza przycisków: koniec walki zamyka ją na polu bitwy,
  // a każda inna scena (np. powrót na mapę po błędzie ładowania) ją otwiera. Walka nie toczy się,
  // dopóki brama nie jest w pełni otwarta.
  useEffect(
    () =>
      effect(() => {
        const scene = game.scene.value.name;
        const phase = gate.phase.value;
        stage.held.value = scene === 'battle' && phase !== 'open';
        if (gate.busy.value) return;
        if (scene === 'result' && phase === 'open') void gate.close();
        else if (scene !== 'result' && phase === 'closed') void gate.open();
      }),
    [game, gate, stage],
  );

  // Zapis z nowszej wersji gry: nie gramy na nim i go nie nadpisujemy (ADR 0005).
  if (storage === 'blocked') {
    return (
      <div class="screen">
        <section class="sheet notice-blocking" role="alert">
          <h2 class="notice-title">{t('notice.blocked.title')}</h2>
          <p>{t('notice.blocked.text')}</p>
          <button type="button" class="btn btn-primary" onClick={() => reloadGame()}>
            {t('update.reload')}
          </button>
        </section>
      </div>
    );
  }

  const scene = game.scene.value;
  const phase = gate.phase.value;
  const recovered = game.recovered.value;
  return (
    <>
      <PaperDefs />
      {/* Za zamkniętą albo ruszającą się bramą scena jest niedostępna także z klawiatury. */}
      <div class="scene-layer" inert={phase !== 'open'}>
        <SceneView {...props} gate={gate} />
      </div>
      <GateView gate={gate} parts={parts} />
      {scene.name === 'result' && phase === 'closed' && (
        <div class="result-layer">
          <ResultScreen
            game={game}
            gate={gate}
            level={scene.level}
            battle={scene.battle}
            rewards={scene.rewards}
          />
        </div>
      )}
      <LoadFailureBanner />
      {recovered && (
        <div class="banner banner-bottom" role="alert">
          <span>{t('notice.recovered')}</span>
          <button
            type="button"
            class="btn btn-primary btn-small"
            onClick={() => {
              game.recovered.value = false;
            }}
          >
            {t('common.ok')}
          </button>
        </div>
      )}
      {storage === 'memory' && !recovered && scene.name === 'map' && (
        <div class="banner banner-corner" role="status">
          <span>{t('notice.memory')}</span>
        </div>
      )}
    </>
  );
}
