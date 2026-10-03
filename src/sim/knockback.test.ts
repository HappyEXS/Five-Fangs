import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.ts';
import { EVENT_KNOCKED_BACK } from './events.ts';
import {
  CLOSE_SLOTS,
  lastEvents,
  melee,
  ranged,
  runTicks,
  runUntil,
  setupOf,
  u,
} from './fixtures.ts';
import { stepBattle } from './step.ts';
import { STATUS_ATTACKING, STATUS_DEAD, STATUS_MOVING, type UnitSpec } from './types.ts';

// Sloty frontowe: bohater na 500, wróg na 520. Pierwsze trafienie wręcz pada w ticku 7.
const still = (overrides: Partial<UnitSpec> = {}) => melee({ moveStep: 0, ...overrides });
const dummy = (overrides: Partial<UnitSpec> = {}) => still({ attack: 0, ...overrides });
const close = (player: (UnitSpec | null)[], enemy: (UnitSpec | null)[]) =>
  createBattle(setupOf(player, enemy, CLOSE_SLOTS));

const knockbacks = (battle: Parameters<typeof lastEvents>[0]) =>
  lastEvents(battle).filter((e) => e[0] === EVENT_KNOCKED_BACK);

describe('odrzut', () => {
  it('odpycha trafionego o różnicę odrzutów, w stronę jego własnej krawędzi', () => {
    const battle = close([still({ knockback: u(20) })], [dummy({ knockback: u(5) })]);
    const { state } = battle;
    runTicks(battle, 6);
    expect(state.x[5]).toBe(u(520));
    stepBattle(battle);
    expect(state.x[5]).toBe(u(535));
    expect(state.prevX[5]).toBe(u(520));
    expect(state.x[0]).toBe(u(500));
    expect(knockbacks(battle)).toEqual([[EVENT_KNOCKED_BACK, 5, u(15), 0]]);
  });

  it('bohater jest odpychany w lewo', () => {
    const battle = close([dummy()], [still({ knockback: u(12) })]);
    runTicks(battle, 7);
    expect(battle.state.x[0]).toBe(u(488));
    expect(knockbacks(battle)).toEqual([[EVENT_KNOCKED_BACK, 0, u(12), 0]]);
  });

  it('przy równych wartościach nikt się nie rusza', () => {
    const battle = close([still({ knockback: u(10) })], [dummy({ knockback: u(10) })]);
    runTicks(battle, 7);
    expect(battle.state.x[0]).toBe(u(500));
    expect(battle.state.x[5]).toBe(u(520));
    expect(knockbacks(battle)).toEqual([]);
  });

  it('słabszy nie odpycha mocniejszego i nie jest przez niego przyciągany', () => {
    // Bohater (4) trafia wroga (10): różnica ujemna, wróg stoi. Wróg odpycha bohatera o 6.
    const battle = close([still({ knockback: u(4) })], [dummy({ knockback: u(10) })]);
    runTicks(battle, 7);
    expect(battle.state.x[5]).toBe(u(520));
    expect(battle.state.x[0]).toBe(u(494));
  });

  it('przy wzajemnym trafieniu w tym samym ticku rusza się tylko słabszy', () => {
    const battle = close([still({ knockback: u(30) })], [still({ knockback: u(10) })]);
    runTicks(battle, 7);
    expect(battle.state.hp[0]).toBe(560);
    expect(battle.state.hp[5]).toBe(560);
    expect(battle.state.x[0]).toBe(u(500));
    expect(battle.state.x[5]).toBe(u(540));
  });

  it('kilka trafień w jednym ticku sumuje przesunięcia', () => {
    const battle = close(
      [still({ knockback: u(10) }), still({ knockback: u(7), range: u(100) })],
      [dummy({ knockback: u(2) })],
    );
    runTicks(battle, 7);
    expect(battle.state.x[5]).toBe(u(520) + u(8) + u(5));
    expect(knockbacks(battle)).toEqual([[EVENT_KNOCKED_BACK, 5, u(13), 0]]);
  });

  it('przycina przesunięcie do krawędzi pola', () => {
    const edge = {
      playerSlots: [970, 440, 380, 320, 260].map(u),
      enemySlots: [990, 992, 994, 996, 998].map(u),
    };
    const pushedRight = createBattle(setupOf([still({ knockback: u(25) })], [dummy()], edge));
    runTicks(pushedRight, 7);
    expect(pushedRight.state.x[5]).toBe(u(1000));
    expect(knockbacks(pushedRight)).toEqual([[EVENT_KNOCKED_BACK, 5, u(10), 0]]);

    const left = {
      playerSlots: [6, 4, 3, 2, 1].map(u),
      enemySlots: [20, 580, 640, 700, 760].map(u),
    };
    const pushedLeft = createBattle(setupOf([dummy()], [still({ knockback: u(25) })], left));
    runTicks(pushedLeft, 7);
    expect(pushedLeft.state.x[0]).toBe(0);

    // Jednostka stojąca już na krawędzi nie dostaje zdarzenia o zerowym przesunięciu.
    runTicks(pushedLeft, 30);
    expect(pushedLeft.state.x[0]).toBe(0);
    expect(knockbacks(pushedLeft)).toEqual([]);
  });

  it('nie przerywa zamachu odrzuconego, a jego cios trafia mimo odległości', () => {
    // Wróg trafia później (hitTick 10), już po odrzuceniu poza własny zasięg.
    const battle = close([still({ knockback: u(30) })], [still({ hitTick: 10 })]);
    const { state } = battle;
    runTicks(battle, 7);
    expect(state.x[5]).toBe(u(550));
    expect(state.status[5]).toBe(STATUS_ATTACKING);
    expect(state.hp[0]).toBe(600);

    runTicks(battle, 4);
    expect(state.tick).toBe(11);
    expect(state.hp[0]).toBe(560);
    expect(state.x[5]).toBe(u(550));
  });

  it('nie odwołuje ciosu wymierzonego w odrzuconego', () => {
    // Drugi bohater trafia w ticku 11, gdy cel został już odepchnięty poza jego zasięg.
    const late = still({ hitTick: 10, range: u(80) });
    const battle = close([still({ knockback: u(60) }), late], [dummy()]);
    const { state } = battle;
    runTicks(battle, 7);
    expect(state.x[5]).toBe(u(580));
    expect((state.x[5] ?? 0) - (state.x[1] ?? 0)).toBeGreaterThan(u(80));
    runTicks(battle, 4);
    expect(state.hp[5]).toBe(600 - 40 - 40);
  });

  it('po odrzucie jednostki muszą podejść, zanim zaczną kolejny atak', () => {
    const battle = close([melee({ knockback: u(30) })], [melee({ attack: 0 })]);
    const { state } = battle;
    runTicks(battle, 13);
    // Zamachy się skończyły, dystans 50 przekracza zasięg 30: obie strony idą.
    expect(state.status[0]).toBe(STATUS_MOVING);
    expect(state.status[5]).toBe(STATUS_MOVING);
    runUntil(battle, () => (state.x[5] ?? 0) - (state.x[0] ?? 0) <= u(30), 20);
    expect((state.x[5] ?? 0) - (state.x[0] ?? 0)).toBeLessThanOrEqual(u(30));
  });

  it('trafienie bez obrażeń też odpycha', () => {
    const battle = close([still({ attack: 0, knockback: u(9) })], [dummy()]);
    runTicks(battle, 7);
    expect(battle.state.hp[5]).toBe(600);
    expect(battle.state.x[5]).toBe(u(529));
  });

  it('jednostka zabita trafieniem nie jest odrzucana', () => {
    const battle = close([still({ knockback: u(20) })], [dummy({ maxHp: 40 }), dummy()]);
    runTicks(battle, 7);
    expect(battle.state.status[5]).toBe(STATUS_DEAD);
    expect(battle.state.x[5]).toBe(u(520));
    expect(knockbacks(battle)).toEqual([]);
  });

  it('pocisk niesie odrzut strzelca', () => {
    const archer = ranged({ moveStep: 0, knockback: u(10) });
    const battle = createBattle(setupOf([archer], [dummy({ knockback: u(4) })]));
    runTicks(battle, 25);
    expect(battle.state.hp[5]).toBe(570);
    expect(battle.state.x[5]).toBe(u(606));
    expect(battle.state.projKnockback[0]).toBe(u(10));
  });

  it('odrzut nie pozwala wrogim jednostkom się minąć', () => {
    const pusher = melee({ knockback: u(40) });
    const battle = close([pusher, pusher], [pusher, melee()]);
    const { state } = battle;
    for (let tick = 0; tick < 300; tick++) {
      stepBattle(battle);
      const front = Math.max(
        state.status[0] === STATUS_DEAD ? 0 : (state.x[0] ?? 0),
        state.status[1] === STATUS_DEAD ? 0 : (state.x[1] ?? 0),
      );
      const enemyFront = Math.min(
        state.status[5] === STATUS_DEAD ? u(1000) : (state.x[5] ?? 0),
        state.status[6] === STATUS_DEAD ? u(1000) : (state.x[6] ?? 0),
      );
      expect(front).toBeLessThanOrEqual(enemyFront);
    }
  });
});
