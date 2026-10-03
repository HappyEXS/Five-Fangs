import { describe, expect, it } from 'vitest';
import {
  ratePerSecondToInterval,
  SUBUNITS_PER_UNIT,
  secondsToTicks,
  subunitsToUnits,
  TICK_MS,
  TICKS_PER_SECOND,
  unitsPerSecondToStep,
  unitsToSubunits,
} from './units.ts';

describe('units', () => {
  it('ma stały krok 30 Hz i 256 podjednostek', () => {
    expect(TICKS_PER_SECOND).toBe(30);
    expect(SUBUNITS_PER_UNIT).toBe(256);
    expect(TICK_MS * TICKS_PER_SECOND).toBeCloseTo(1000);
  });

  it('przelicza jednostki świata na podjednostki i z powrotem', () => {
    expect(unitsToSubunits(30)).toBe(7680);
    expect(unitsToSubunits(0.5)).toBe(128);
    expect(subunitsToUnits(7680)).toBe(30);
  });

  it('przelicza sekundy na całkowite ticki', () => {
    expect(secondsToTicks(0.4)).toBe(12);
    expect(secondsToTicks(90)).toBe(2700);
    expect(secondsToTicks(0.6)).toBe(18);
  });

  it('przelicza prędkość na krok w podjednostkach na tick', () => {
    expect(unitsPerSecondToStep(60)).toBe(512);
    expect(unitsPerSecondToStep(50)).toBe(427);
    expect(unitsPerSecondToStep(400)).toBe(3413);
  });

  it('przelicza częstotliwość na odstęp w tickach, co najmniej 1', () => {
    expect(ratePerSecondToInterval(1)).toBe(30);
    expect(ratePerSecondToInterval(0.8)).toBe(38);
    expect(ratePerSecondToInterval(1.3)).toBe(23);
    expect(ratePerSecondToInterval(100)).toBe(1);
  });
});
