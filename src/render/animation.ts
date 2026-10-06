// Sterowanie animacją ze stanu symulacji. Symulacja jest źródłem prawdy o czasie ataku:
// faza klipu ataku wynika z licznika zamachu, faza chodu z przebytego dystansu.
// Wyświetlana poza dąży wykładniczo do pozy z klipu, co wygładza przejścia między klipami.
import {
  EVENT_DAMAGED,
  EVENT_DIED,
  EVENT_SUMMONED,
  type EventBuffer,
  MAX_UNITS,
  STATUS_ATTACKING,
  STATUS_MOVING,
} from '../sim/index.ts';
import { type CompiledClip, sampleClip } from './clips.ts';
import type { CompiledRig, CompiledString } from './rig.ts';

/** Cykle klipu idle na sekundę. */
const IDLE_RATE = 0.7;
/** Tempo dochodzenia do pozy docelowej (1/s); atak nadąża szybciej, żeby trafienie było wyraźne. */
const BLEND_RATE = 14;
const BLEND_RATE_ATTACK = 32;
/** Czas białego błysku po trafieniu. */
export const FLASH_MS = 110;
/** Czas padania i zanikania po śmierci. */
export const DEATH_MS = 700;

/** Wygląd jednostki rozwiązany do struktur renderera. */
export interface UnitLook {
  readonly rig: CompiledRig;
  /** Wartości kanałów, których klip nie animuje. */
  readonly rest: Float32Array;
  readonly idle: CompiledClip;
  readonly walk: CompiledClip;
  readonly attack: CompiledClip;
  /** Jednostki logiczne sceny na jednostkę rigu. */
  readonly scale: number;
  /** Cięciwa postawy tej jednostki albo null. */
  readonly string: CompiledString | null;
}

export interface Animator {
  /** Liczba kanałów pozy na jednostkę. */
  readonly channels: number;
  /** Wyświetlana poza: `MAX_UNITS × channels`. */
  readonly pose: Float32Array;
  /** Bufor roboczy na pozę docelową jednej jednostki. */
  readonly target: Float32Array;
  readonly posed: Uint8Array;
  readonly idlePhase: Float32Array;
  readonly walkPhase: Float32Array;
  /** Pozycja X z poprzedniej klatki, do liczenia przebytego dystansu. */
  readonly lastX: Float32Array;
  /** Pozostały czas błysku trafienia. */
  readonly flashMs: Float32Array;
  /** Czas od śmierci albo -1 dla żywych. */
  readonly deathMs: Float32Array;
}

export function createAnimator(channels: number): Animator {
  return {
    channels,
    pose: new Float32Array(MAX_UNITS * channels),
    target: new Float32Array(channels),
    posed: new Uint8Array(MAX_UNITS),
    idlePhase: new Float32Array(MAX_UNITS),
    walkPhase: new Float32Array(MAX_UNITS),
    lastX: new Float32Array(MAX_UNITS),
    flashMs: new Float32Array(MAX_UNITS),
    deathMs: new Float32Array(MAX_UNITS).fill(-1),
  };
}

export function resetAnimator(animator: Animator): void {
  animator.pose.fill(0);
  animator.posed.fill(0);
  animator.walkPhase.fill(0);
  animator.flashMs.fill(0);
  animator.deathMs.fill(-1);
  // Każda jednostka zaczyna idle w innej fazie, żeby drużyna nie oddychała równym rytmem.
  for (let i = 0; i < MAX_UNITS; i++) animator.idlePhase[i] = (i * 0.37) % 1;
}

/**
 * Reakcja na zdarzenia jednego ticka: błysk przy obrażeniach, początek animacji śmierci,
 * a przy przyzwaniu wyzerowanie miejsca, w którym mógł jeszcze padać poprzedni przyzwany.
 */
export function animatorOnEvents(animator: Animator, events: EventBuffer): void {
  for (let i = 0; i < events.count; i++) {
    const type = events.type[i];
    const unit = events.a[i] ?? 0;
    if (type === EVENT_DAMAGED) {
      if ((events.b[i] ?? 0) > 0) animator.flashMs[unit] = FLASH_MS;
    } else if (type === EVENT_DIED) {
      animator.deathMs[unit] = 0;
    } else if (type === EVENT_SUMMONED) {
      // `posed` = 0: pierwsza klatka nowej jednostki ustawi pozę od razu, bez dochodzenia z pozy
      // poprzednika, i nie policzy dystansu od jego ostatniej pozycji.
      animator.posed[unit] = 0;
      animator.walkPhase[unit] = 0;
      animator.flashMs[unit] = 0;
      animator.deathMs[unit] = -1;
    }
  }
}

/**
 * Postęp klipu ataku (0..1). `swingTick` to stan po ostatnim ticku: w ticku trafienia wynosi
 * `hitTick + 1`, więc przy `alpha = 1` wynik równa się wtedy `hitTick / swingTicks`
 * i animacja pokazuje trafienie dokładnie w chwili, w której symulacja je rozstrzyga.
 */
export function attackProgress(swingTick: number, swingTicks: number, alpha: number): number {
  const progress = (swingTick - 2 + alpha) / swingTicks;
  return progress < 0 ? 0 : progress > 1 ? 1 : progress;
}

/**
 * Aktualizuje pozę jednostki. `x` to jej pozycja na scenie w jednostkach logicznych,
 * `dtMs` czas od poprzedniej klatki. Bez alokacji.
 */
export function updateUnitPose(
  animator: Animator,
  unit: number,
  look: UnitLook,
  status: number,
  swingTick: number,
  swingTicks: number,
  alpha: number,
  x: number,
  dtMs: number,
): void {
  const { pose, target, channels } = animator;
  const offset = unit * channels;

  const death = animator.deathMs[unit] ?? -1;
  if (death >= 0) {
    // Po śmierci poza zastyga; renderer obraca i wygasza całą postać.
    animator.deathMs[unit] = death + dtMs;
    return;
  }
  const flash = animator.flashMs[unit] ?? 0;
  if (flash > 0) animator.flashMs[unit] = flash > dtMs ? flash - dtMs : 0;

  // W pierwszej klatce jednostki nie ma jeszcze poprzedniej pozycji, więc dystans to zero.
  const first = (animator.posed[unit] ?? 0) === 0;
  const moved = first ? 0 : Math.abs(x - (animator.lastX[unit] ?? 0));
  animator.lastX[unit] = x;
  let idle = (animator.idlePhase[unit] ?? 0) + (dtMs * IDLE_RATE) / 1000;
  idle -= Math.floor(idle);
  animator.idlePhase[unit] = idle;

  let rate = BLEND_RATE;
  if (status === STATUS_ATTACKING) {
    rate = BLEND_RATE_ATTACK;
    sampleClip(look.attack, attackProgress(swingTick, swingTicks, alpha), look.rest, target, 0);
  } else if (status === STATUS_MOVING) {
    let walk = (animator.walkPhase[unit] ?? 0) + moved / (look.rig.strideLength * look.scale);
    walk -= Math.floor(walk);
    animator.walkPhase[unit] = walk;
    sampleClip(look.walk, walk, look.rest, target, 0);
  } else {
    sampleClip(look.idle, idle, look.rest, target, 0);
  }

  if (first) {
    // Pierwsza poza bez przejścia: jednostka nie ma z czego się „rozwijać”.
    animator.posed[unit] = 1;
    for (let c = 0; c < channels; c++) pose[offset + c] = target[c] ?? 0;
    return;
  }
  const k = 1 - Math.exp((-rate * dtMs) / 1000);
  for (let c = 0; c < channels; c++) {
    const current = pose[offset + c] ?? 0;
    pose[offset + c] = current + ((target[c] ?? 0) - current) * k;
  }
}
