import { describe, expect, it } from 'vitest';
import { requireContent } from '../content/load.ts';
import {
  createEventBuffer,
  EVENT_DAMAGED,
  EVENT_DIED,
  EVENT_SUMMONED,
  pushEvent,
  STATUS_ATTACKING,
  STATUS_IDLE,
  STATUS_MOVING,
} from '../sim/index.ts';
import {
  animatorOnEvents,
  attackProgress,
  createAnimator,
  FLASH_MS,
  resetAnimator,
  type UnitLook,
  updateUnitPose,
} from './animation.ts';
import { sampleClip } from './clips.ts';
import { compileRig } from './rig.ts';

const raw = requireContent().rigs.get('humanoid');
if (raw === undefined) throw new Error('no humanoid rig');
const rig = compileRig(raw);

function lookFor(stance: string, attack: string): UnitLook {
  const rest = rig.stances.get(stance);
  const idle = rig.clips.get('idle');
  const walk = rig.clips.get('walk');
  const clip = rig.clips.get(attack);
  if (!rest || !idle || !walk || !clip) throw new Error('rig is missing clips');
  return { rig, rest, idle, walk, attack: clip, scale: rig.scale, string: null };
}

const swordsman = lookFor('sword', 'slash');
const ARM_F = rig.boneIds.indexOf('armF');
const WEAPON = rig.boneIds.indexOf('weapon');
const DEG = Math.PI / 180;

function animator() {
  const a = createAnimator(rig.channelCount);
  resetAnimator(a);
  return a;
}

/** Poza jednostki 0 po jednej aktualizacji. */
function poseAfter(status: number, swingTick: number, alpha: number, a = animator()) {
  updateUnitPose(a, 0, swordsman, status, swingTick, 12, alpha, 100, 16);
  return a.pose;
}

describe('attackProgress', () => {
  it('w ticku trafienia przy alpha = 1 równa się ułamkowi trafienia', () => {
    // Zamach 12 ticków, trafienie w 6.: stan po ticku trafienia ma swingTick = 7.
    expect(attackProgress(7, 12, 1)).toBeCloseTo(0.5);
    expect(attackProgress(7, 12, 0)).toBeCloseTo(5 / 12);
  });

  it('mieści się w przedziale 0..1', () => {
    expect(attackProgress(1, 12, 0)).toBe(0);
    expect(attackProgress(1, 12, 1)).toBe(0);
    expect(attackProgress(13, 12, 1)).toBe(1);
  });
});

describe('wybór klipu', () => {
  it('stojąca jednostka dostaje pozę idle z postawą broni', () => {
    const pose = poseAfter(STATUS_IDLE, -1, 0);
    expect(pose[WEAPON]).toBeCloseTo(-75 * DEG);
    expect(pose[ARM_F]).toBeLessThan(0);
  });

  it('pierwsza aktualizacja ustawia pozę bez przejścia', () => {
    const a = animator();
    const expected = new Float32Array(rig.channelCount);
    sampleClip(swordsman.attack, 0.5, swordsman.rest, expected, 0);
    updateUnitPose(a, 0, swordsman, STATUS_ATTACKING, 7, 12, 1, 100, 16);
    expect(Array.from(a.pose.subarray(0, rig.channelCount))).toEqual(Array.from(expected));
  });

  it('atak podąża za licznikiem zamachu z symulacji', () => {
    // W klipie slash ramię jest najwyżej (-170°) w 0,4 zamachu, czyli przy swingTick ≈ 5,8.
    const windup = poseAfter(STATUS_ATTACKING, 6, 0.8);
    expect(windup[ARM_F]).toBeCloseTo(-170 * DEG, 1);
    const start = poseAfter(STATUS_ATTACKING, 1, 0);
    expect(start[ARM_F]).toBeCloseTo(-10 * DEG);
  });

  it('faza chodu rośnie z przebytym dystansem, nie z czasem', () => {
    const a = animator();
    updateUnitPose(a, 0, swordsman, STATUS_MOVING, -1, 12, 0, 100, 16);
    expect(a.walkPhase[0]).toBe(0);
    // Stojąc w miejscu faza się nie zmienia, choć czas płynie.
    updateUnitPose(a, 0, swordsman, STATUS_MOVING, -1, 12, 0, 100, 500);
    expect(a.walkPhase[0]).toBe(0);
    // Długość kroku to 64 jednostki rigu × skala 1,4 = 89,6 jednostki sceny.
    updateUnitPose(a, 0, swordsman, STATUS_MOVING, -1, 12, 0, 100 + 44.8, 16);
    expect(a.walkPhase[0]).toBeCloseTo(0.5);
    updateUnitPose(a, 0, swordsman, STATUS_MOVING, -1, 12, 0, 100 + 89.6 + 8.96, 16);
    expect(a.walkPhase[0]).toBeCloseTo(0.1);
  });

  it('idle biegnie z czasem i każda jednostka zaczyna w innej fazie', () => {
    const a = animator();
    expect(a.idlePhase[0]).not.toBe(a.idlePhase[1]);
    const before = a.idlePhase[0] ?? 0;
    updateUnitPose(a, 0, swordsman, STATUS_IDLE, -1, 12, 0, 100, 1000);
    expect(a.idlePhase[0]).toBeCloseTo(before + 0.7);
  });
});

describe('przejścia', () => {
  it('poza dąży do klipu stopniowo, szybciej dla ataku', () => {
    const blend = (status: number) => {
      const a = animator();
      updateUnitPose(a, 0, swordsman, STATUS_IDLE, -1, 12, 0, 100, 16);
      const idleArm = a.pose[ARM_F] ?? 0;
      updateUnitPose(a, 0, swordsman, status, 6, 12, 0.8, 100, 16);
      return Math.abs((a.pose[ARM_F] ?? 0) - idleArm);
    };
    const attackStep = blend(STATUS_ATTACKING);
    expect(attackStep).toBeGreaterThan(0);
    // Po jednej klatce poza jest dopiero w drodze do -170°.
    expect(attackStep).toBeLessThan(150 * DEG);

    const a = animator();
    for (let i = 0; i < 60; i++)
      updateUnitPose(a, 0, swordsman, STATUS_ATTACKING, 6, 12, 0.8, 100, 16);
    expect(a.pose[ARM_F]).toBeCloseTo(-170 * DEG, 1);
  });

  it('przy zerowym czasie klatki poza się nie zmienia', () => {
    const a = animator();
    updateUnitPose(a, 0, swordsman, STATUS_IDLE, -1, 12, 0, 100, 16);
    const before = Array.from(a.pose);
    updateUnitPose(a, 0, swordsman, STATUS_ATTACKING, 6, 12, 0.8, 100, 0);
    expect(Array.from(a.pose)).toEqual(before);
  });

  it('jednostki mają osobne pozy', () => {
    const a = animator();
    updateUnitPose(a, 3, swordsman, STATUS_ATTACKING, 6, 12, 0.8, 100, 16);
    expect(a.pose[ARM_F]).toBe(0);
    expect(a.pose[3 * rig.channelCount + ARM_F]).toBeCloseTo(-170 * DEG, 1);
  });
});

describe('zdarzenia', () => {
  it('obrażenia włączają błysk, który gaśnie z czasem', () => {
    const a = animator();
    const events = createEventBuffer(8);
    pushEvent(events, EVENT_DAMAGED, 2, 40, 5);
    pushEvent(events, EVENT_DAMAGED, 3, 0, 5);
    animatorOnEvents(a, events);
    expect(a.flashMs[2]).toBe(FLASH_MS);
    expect(a.flashMs[3]).toBe(0);

    updateUnitPose(a, 2, swordsman, STATUS_IDLE, -1, 12, 0, 100, 60);
    expect(a.flashMs[2]).toBe(FLASH_MS - 60);
    updateUnitPose(a, 2, swordsman, STATUS_IDLE, -1, 12, 0, 100, 500);
    expect(a.flashMs[2]).toBe(0);
  });

  it('po śmierci poza zastyga, a licznik śmierci rośnie', () => {
    const a = animator();
    updateUnitPose(a, 1, swordsman, STATUS_IDLE, -1, 12, 0, 100, 16);
    const frozen = Array.from(a.pose);
    const events = createEventBuffer(8);
    pushEvent(events, EVENT_DIED, 1, 0, 0);
    animatorOnEvents(a, events);
    expect(a.deathMs[1]).toBe(0);

    updateUnitPose(a, 1, swordsman, STATUS_ATTACKING, 6, 12, 0.8, 300, 100);
    updateUnitPose(a, 1, swordsman, STATUS_ATTACKING, 6, 12, 0.8, 300, 150);
    expect(a.deathMs[1]).toBe(250);
    expect(Array.from(a.pose)).toEqual(frozen);
  });

  it('przyzwanie zeruje miejsce: nowa jednostka nie dziedziczy padania ani pozy poprzednika', () => {
    const a = animator();
    updateUnitPose(a, 12, swordsman, STATUS_MOVING, -1, 12, 0, 100, 16);
    updateUnitPose(a, 12, swordsman, STATUS_MOVING, -1, 12, 0, 130, 16);
    const events = createEventBuffer(8);
    pushEvent(events, EVENT_DAMAGED, 12, 40, 5);
    pushEvent(events, EVENT_DIED, 12, 0, 0);
    animatorOnEvents(a, events);
    expect(a.deathMs[12]).toBe(0);
    expect(a.walkPhase[12]).toBeGreaterThan(0);

    events.count = 0;
    pushEvent(events, EVENT_SUMMONED, 12, 0, 0);
    animatorOnEvents(a, events);
    expect(a.deathMs[12]).toBe(-1);
    expect(a.flashMs[12]).toBe(0);
    expect(a.walkPhase[12]).toBe(0);
    expect(a.posed[12]).toBe(0);
    // Pierwsza klatka nowej jednostki: poza wprost z klipu, a dystans liczony od jej pozycji,
    // nie od miejsca, w którym padł poprzednik.
    updateUnitPose(a, 12, swordsman, STATUS_MOVING, -1, 12, 0, 400, 16);
    expect(a.walkPhase[12]).toBe(0);
    expect(a.posed[12]).toBe(1);
  });

  it('reset przywraca stan początkowy', () => {
    const a = animator();
    const events = createEventBuffer(8);
    pushEvent(events, EVENT_DIED, 1, 0, 0);
    pushEvent(events, EVENT_DAMAGED, 2, 10, 0);
    animatorOnEvents(a, events);
    updateUnitPose(a, 0, swordsman, STATUS_IDLE, -1, 12, 0, 100, 16);
    resetAnimator(a);
    expect(a.deathMs[1]).toBe(-1);
    expect(a.flashMs[2]).toBe(0);
    expect(a.posed[0]).toBe(0);
  });
});
