// Renderer walki na Canvas 2D. Gorąca ścieżka (`draw`) nie alokuje: żadnych obiektów,
// tablic, domknięć ani napisów tworzonych co klatkę.
import { type Battle, type EventBuffer, isAlive, MAX_UNITS, TEAM_SIZE } from '../sim/index.ts';
import { drawBackground } from './background.ts';
import { type Camera, createCamera, fitCamera, GROUND_Y } from './camera.ts';
import type { Renderer } from './renderer.ts';
import type { Viewport } from './viewport.ts';

const PLAYER_COLOR = '#6fa8dc';
const ENEMY_COLOR = '#d9705f';
const PROJECTILE_COLOR = '#f2e3a0';
const HP_BACK = '#11151c';
const HP_FILL = '#7fd36b';

const UNIT_WIDTH = 34;
const UNIT_HEIGHT = 96;
const HP_BAR_WIDTH = 46;
const HP_BAR_HEIGHT = 5;
/** Wysokość lotu pocisku nad ziemią w jednostkach logicznych. */
const PROJECTILE_HEIGHT = 62;

export function createCanvasRenderer(ctx: CanvasRenderingContext2D): Renderer {
  const camera: Camera = createCamera();
  let battle: Battle | null = null;

  function drawUnits(current: Battle, alpha: number): void {
    const { state, specs } = current;
    for (let i = 0; i < MAX_UNITS; i++) {
      if (!isAlive(state.status[i] ?? 0)) continue;
      const prev = state.prevX[i] ?? 0;
      const x = (prev + ((state.x[i] ?? 0) - prev) * alpha) * camera.scale;

      ctx.fillStyle = i < TEAM_SIZE ? PLAYER_COLOR : ENEMY_COLOR;
      ctx.fillRect(x - UNIT_WIDTH / 2, GROUND_Y - UNIT_HEIGHT, UNIT_WIDTH, UNIT_HEIGHT);

      const maxHp = specs.maxHp[i] ?? 1;
      const hp = state.hp[i] ?? 0;
      const fraction = hp <= 0 ? 0 : hp >= maxHp ? 1 : hp / maxHp;
      const barY = GROUND_Y - UNIT_HEIGHT - 14;
      ctx.fillStyle = HP_BACK;
      ctx.fillRect(x - HP_BAR_WIDTH / 2 - 1, barY - 1, HP_BAR_WIDTH + 2, HP_BAR_HEIGHT + 2);
      ctx.fillStyle = HP_FILL;
      ctx.fillRect(x - HP_BAR_WIDTH / 2, barY, HP_BAR_WIDTH * fraction, HP_BAR_HEIGHT);
    }
  }

  function drawProjectiles(current: Battle, alpha: number): void {
    const { state } = current;
    ctx.fillStyle = PROJECTILE_COLOR;
    for (let p = 0; p < state.projCount; p++) {
      const prev = state.projPrevX[p] ?? 0;
      const x = (prev + ((state.projX[p] ?? 0) - prev) * alpha) * camera.scale;
      ctx.fillRect(x - 9, GROUND_Y - PROJECTILE_HEIGHT - 1, 18, 3);
    }
  }

  return {
    beginBattle(next: Battle): void {
      battle = next;
      fitCamera(camera, next.width);
    },
    consume(_events: EventBuffer): void {
      // Efekty reagujące na zdarzenia dojdą w zadaniu M2-7.
    },
    draw(viewport: Viewport, alpha: number, _frameMs: number): void {
      drawBackground(ctx, viewport);
      if (battle === null) return;
      drawUnits(battle, alpha);
      drawProjectiles(battle, alpha);
    },
    endBattle(): void {
      battle = null;
    },
  };
}
