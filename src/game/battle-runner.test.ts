import { describe, expect, it } from 'vitest';
import type { Renderer } from '../render/renderer.ts';
import { createViewport } from '../render/viewport.ts';
import { CLOSE_SLOTS, melee, setupOf } from '../sim/fixtures.ts';
import { OUTCOME_WIN } from '../sim/index.ts';
import { createBattleRunner } from './battle-runner.ts';

const TICK = 1000 / 30;
const viewport = createViewport();

/** Renderer zapisujący wywołania zamiast rysować. */
function recordingRenderer() {
  const calls = {
    begin: 0,
    end: 0,
    consumed: 0,
    events: 0,
    alphas: [] as number[],
    frameMs: [] as number[],
  };
  const renderer: Renderer = {
    beginBattle: () => {
      calls.begin++;
    },
    consume: (events) => {
      calls.consumed++;
      calls.events += events.count;
    },
    draw: (_viewport, alpha, frameMs) => {
      calls.alphas.push(alpha);
      calls.frameMs.push(frameMs);
    },
    setTopUnit: () => {},
    endBattle: () => {
      calls.end++;
    },
  };
  return { renderer, calls };
}

const duel = () => setupOf([melee()], [melee({ maxHp: 40, attack: 0, moveStep: 0 })], CLOSE_SLOTS);

describe('battle runner', () => {
  it('wykonuje ticki według czasu klatki i przekazuje zdarzenia każdego ticka', () => {
    const { renderer, calls } = recordingRenderer();
    const runner = createBattleRunner(duel(), [], renderer);
    expect(calls.begin).toBe(1);

    runner.frame(viewport, TICK * 3 + 1);
    expect(runner.battle.state.tick).toBe(3);
    expect(calls.consumed).toBe(3);
    // Tick 1: obie jednostki zaczynają atak.
    expect(calls.events).toBe(2);
    expect(calls.alphas[0]).toBeGreaterThan(0);
    expect(calls.alphas[0]).toBeLessThan(0.1);
  });

  it('mnożnik prędkości przyspiesza ticki i czas efektów', () => {
    const { renderer, calls } = recordingRenderer();
    const runner = createBattleRunner(duel(), [], renderer);
    runner.loop.speed = 4;
    runner.frame(viewport, TICK);
    expect(runner.battle.state.tick).toBe(4);
    expect(calls.frameMs[0]).toBeCloseTo(TICK * 4);
  });

  it('w pauzie nie wykonuje ticków, rysuje stan ostatniego ticka, a krokowanie działa', () => {
    const { renderer, calls } = recordingRenderer();
    const runner = createBattleRunner(duel(), [], renderer);
    runner.loop.paused = true;
    runner.frame(viewport, 500);
    expect(runner.battle.state.tick).toBe(0);
    expect(calls.alphas).toEqual([1]);
    expect(calls.frameMs).toEqual([0]);

    runner.stepOnce();
    runner.stepOnce();
    expect(runner.battle.state.tick).toBe(2);
    expect(calls.consumed).toBe(2);

    // Animacja dostaje czas dwóch ręcznych ticków, a potem znów stoi.
    runner.frame(viewport, 500);
    runner.frame(viewport, 500);
    expect(calls.frameMs[1]).toBeCloseTo(TICK * 2);
    expect(calls.frameMs[2]).toBe(0);
    expect(runner.battle.state.tick).toBe(2);
  });

  it('po zakończeniu walki nie wykonuje dalszych ticków i rysuje stan końcowy', () => {
    const { renderer, calls } = recordingRenderer();
    const runner = createBattleRunner(duel(), [], renderer);
    // Wróg ginie w ticku 7; klatka niesie czas na 7,5 ticka, a kolejne klatki dalszy czas.
    runner.frame(viewport, TICK * 7.5);
    runner.frame(viewport, TICK * 3);
    expect(runner.battle.state.outcome).toBe(OUTCOME_WIN);
    expect(runner.battle.state.tick).toBe(7);
    expect(calls.consumed).toBe(7);
    expect(calls.alphas).toEqual([1, 1]);
    runner.stepOnce();
    expect(runner.battle.state.tick).toBe(7);
  });

  it('dispose zwalnia renderer', () => {
    const { renderer, calls } = recordingRenderer();
    createBattleRunner(duel(), [], renderer).dispose();
    expect(calls.end).toBe(1);
  });
});
