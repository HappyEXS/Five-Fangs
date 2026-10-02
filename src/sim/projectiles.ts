// Faza 4: pociski fizyczne (ADR 0007). Pocisk to punkt lecący ze stałym krokiem aż do
// krawędzi pola; nie śledzi celu. Zwykły trafia pierwszego wroga na drodze, przebijający
// każdego, którego minie.
//
// Trafienie wykrywamy przez położenie względne: wróg był przed pociskiem na początku ticka
// i nie jest przed nim po ruchu obu. Sam przedział przebyty przez pocisk nie wystarcza,
// bo wróg idący naprzeciw mógłby go „przeskoczyć” w fazie ruchu.

import type { Battle } from './battle.ts';
import { isAlive } from './decide.ts';
import {
  EVENT_PROJECTILE_EXPIRED,
  EVENT_PROJECTILE_HIT,
  EVENT_PROJECTILE_SPAWNED,
  pushEvent,
} from './events.ts';
import { queueHit } from './hits.ts';
import type { BattleState } from './state.ts';
import { forwardOf, MAX_PROJECTILES, TEAM_SIZE, teamOf } from './types.ts';

/** Tworzy pocisk w pozycji strzelca, z jego obrażeniami z chwili wystrzału. */
export function spawnProjectile(battle: Battle, owner: number): void {
  const { state, specs } = battle;
  const p = state.projCount;
  // Walidacja setupu gwarantuje, że pula wystarczy; przepełnienie oznacza błąd w tej gwarancji.
  if (p >= MAX_PROJECTILES) throw new Error('Projectile pool overflow');

  const x = state.x[owner] ?? 0;
  const id = state.nextProjId;
  state.nextProjId = id + 1;
  state.projId[p] = id;
  state.projX[p] = x;
  state.projPrevX[p] = x;
  state.projStep[p] = forwardOf(teamOf(owner)) * (specs.projectileStep[owner] ?? 0);
  state.projOwner[p] = owner;
  state.projDamage[p] = specs.attack[owner] ?? 0;
  state.projKnockback[p] = specs.knockback[owner] ?? 0;
  state.projPierce[p] = specs.pierce[owner] ?? 0;
  state.projHitMask[p] = 0;
  state.projCount = p + 1;
  pushEvent(battle.events, EVENT_PROJECTILE_SPAWNED, id, owner, x);
}

function copyProjectile(state: BattleState, from: number, to: number): void {
  state.projId[to] = state.projId[from] ?? 0;
  state.projX[to] = state.projX[from] ?? 0;
  state.projPrevX[to] = state.projPrevX[from] ?? 0;
  state.projStep[to] = state.projStep[from] ?? 0;
  state.projOwner[to] = state.projOwner[from] ?? 0;
  state.projDamage[to] = state.projDamage[from] ?? 0;
  state.projKnockback[to] = state.projKnockback[from] ?? 0;
  state.projPierce[to] = state.projPierce[from] ?? 0;
  state.projHitMask[to] = state.projHitMask[from] ?? 0;
}

function hit(battle: Battle, p: number, target: number): void {
  const { state } = battle;
  pushEvent(
    battle.events,
    EVENT_PROJECTILE_HIT,
    state.projId[p] ?? 0,
    target,
    state.x[target] ?? 0,
  );
  queueHit(
    battle,
    state.projOwner[p] ?? 0,
    target,
    state.projDamage[p] ?? 0,
    state.projKnockback[p] ?? 0,
  );
}

/**
 * Przesuwa pocisk `p` i rozstrzyga trafienia. Zwraca true, jeśli pocisk leci dalej.
 */
function advance(battle: Battle, p: number): boolean {
  const { state } = battle;
  const { status, x, prevX } = state;
  const step = state.projStep[p] ?? 0;
  const direction = step > 0 ? 1 : -1;
  const from = state.projX[p] ?? 0;
  const to = from + step;
  const firstEnemy = (state.projOwner[p] ?? 0) < TEAM_SIZE ? TEAM_SIZE : 0;
  state.projX[p] = to;

  if ((state.projPierce[p] ?? 0) !== 0) {
    let mask = state.projHitMask[p] ?? 0;
    for (let enemy = firstEnemy; enemy < firstEnemy + TEAM_SIZE; enemy++) {
      if (!isAlive(status[enemy] ?? 0) || (mask & (1 << enemy)) !== 0) continue;
      const before = ((prevX[enemy] ?? 0) - from) * direction;
      const after = ((x[enemy] ?? 0) - to) * direction;
      if (before >= 0 && after <= 0) {
        mask |= 1 << enemy;
        hit(battle, p, enemy);
      }
    }
    state.projHitMask[p] = mask;
  } else {
    // Pierwszy na drodze: najbliższy przed pociskiem na początku ticka; remis → niższe unitId.
    let nearest = -1;
    let nearestBefore = 0;
    for (let enemy = firstEnemy; enemy < firstEnemy + TEAM_SIZE; enemy++) {
      if (!isAlive(status[enemy] ?? 0)) continue;
      const before = ((prevX[enemy] ?? 0) - from) * direction;
      const after = ((x[enemy] ?? 0) - to) * direction;
      if (before >= 0 && after <= 0 && (nearest === -1 || before < nearestBefore)) {
        nearest = enemy;
        nearestBefore = before;
      }
    }
    if (nearest !== -1) {
      hit(battle, p, nearest);
      return false;
    }
  }

  if (to < 0 || to > battle.width) {
    pushEvent(battle.events, EVENT_PROJECTILE_EXPIRED, state.projId[p] ?? 0, 0, to);
    return false;
  }
  return true;
}

export function moveProjectiles(battle: Battle): void {
  const { state } = battle;
  const count = state.projCount;
  // Pociski, które lecą dalej, zsuwamy na początek tablic z zachowaniem kolejności wystrzelenia.
  let kept = 0;
  for (let p = 0; p < count; p++) {
    if (!advance(battle, p)) continue;
    if (kept !== p) copyProjectile(state, p, kept);
    kept++;
  }
  state.projCount = kept;
}
