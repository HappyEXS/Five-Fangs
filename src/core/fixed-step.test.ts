import { describe, expect, it } from 'vitest';
import { advanceFixedStep, createFixedStep, fixedStepAlpha, resetFixedStep } from './fixed-step.ts';

describe('fixed-step', () => {
  it('wykonuje 30 kroków na sekundę przy klatkach 60 Hz', () => {
    const loop = createFixedStep(30);
    let steps = 0;
    for (let frame = 0; frame < 60; frame++) steps += advanceFixedStep(loop, 1000 / 60);
    expect(steps).toBe(30);
  });

  it('zbiera czas z kilku krótkich klatek', () => {
    const loop = createFixedStep(30);
    expect(advanceFixedStep(loop, 10)).toBe(0);
    expect(advanceFixedStep(loop, 10)).toBe(0);
    expect(advanceFixedStep(loop, 10)).toBe(0);
    expect(advanceFixedStep(loop, 10)).toBe(1);
    expect(fixedStepAlpha(loop)).toBeCloseTo((40 - 1000 / 30) / (1000 / 30));
  });

  it('wykonuje kilka kroków po długiej klatce', () => {
    const loop = createFixedStep(30);
    expect(advanceFixedStep(loop, 100)).toBe(3);
  });

  it('ogranicza skok czasu, np. po powrocie do karty', () => {
    const loop = createFixedStep(30);
    expect(advanceFixedStep(loop, 60_000)).toBe(7);
  });

  it('mnożnik prędkości skaluje liczbę kroków', () => {
    const loop = createFixedStep(30);
    loop.speed = 4;
    let steps = 0;
    for (let frame = 0; frame < 60; frame++) steps += advanceFixedStep(loop, 1000 / 60);
    expect(steps).toBe(120);
  });

  it('w pauzie czas nie płynie i akumulator się nie zmienia', () => {
    const loop = createFixedStep(30);
    advanceFixedStep(loop, 20);
    loop.paused = true;
    expect(advanceFixedStep(loop, 500)).toBe(0);
    expect(loop.accumulatorMs).toBe(20);
    loop.paused = false;
    expect(advanceFixedStep(loop, 20)).toBe(1);
  });

  it('ignoruje zerowy, ujemny i nieliczbowy czas klatki', () => {
    const loop = createFixedStep(30);
    expect(advanceFixedStep(loop, 0)).toBe(0);
    expect(advanceFixedStep(loop, -50)).toBe(0);
    expect(advanceFixedStep(loop, Number.NaN)).toBe(0);
    expect(loop.accumulatorMs).toBe(0);
  });

  it('alpha mieści się w przedziale 0..1, a reset zeruje zaległość', () => {
    const loop = createFixedStep(30);
    for (const ms of [5, 17, 33, 41, 16.7, 100]) {
      advanceFixedStep(loop, ms);
      expect(fixedStepAlpha(loop)).toBeGreaterThanOrEqual(0);
      expect(fixedStepAlpha(loop)).toBeLessThan(1);
    }
    resetFixedStep(loop);
    expect(fixedStepAlpha(loop)).toBe(0);
  });
});
