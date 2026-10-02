// Operacje edytora animacji na surowym klipie (format z content/schema-rig.ts).
// Czyste funkcje: każda zwraca nowy klip i utrzymuje reguły walidatora treści, więc klip
// po dowolnej sekwencji edycji daje się wyeksportować bez ręcznych poprawek:
// pierwsza klatka kanału ma czas 0, ostatnia (gdy jest ich więcej) czas 1, czasy rosną,
// a w klipie zapętlonym wartości na obu końcach są równe.
import type { RawClip } from '../../content/schema-rig.ts';

export type Key = readonly [time: number, value: number];

/** Rozdzielczość czasu klatek kluczowych. */
export const TIME_STEP = 0.001;

export function snapTime(t: number): number {
  const snapped = Math.round(t / TIME_STEP) * TIME_STEP;
  // Zaokrąglenie do trzech miejsc usuwa ogon błędu binarnego (0.30000000000000004).
  return Math.min(1, Math.max(0, Math.round(snapped * 1000) / 1000));
}

/** Indeks klatki o czasie `t` albo -1. */
export function keyIndexAt(keys: readonly Key[], t: number): number {
  for (let i = 0; i < keys.length; i++) {
    if (Math.abs((keys[i]?.[0] ?? -1) - t) < TIME_STEP / 2) return i;
  }
  return -1;
}

/**
 * Wartość kanału w chwili `t` w jednostkach surowych (stopnie albo jednostki rigu), liczona
 * tak samo jak `sampleClip` renderera: interpolacja smoothstep między klatkami.
 */
export function sampleKeys(keys: readonly Key[] | undefined, t: number, rest: number): number {
  if (keys === undefined || keys.length === 0) return rest;
  let i = 0;
  const last = keys.length - 1;
  while (i < last && (keys[i + 1]?.[0] ?? 1) <= t) i++;
  const [t0 = 0, v0 = 0] = keys[i] ?? [];
  if (i >= last) return v0;
  const [t1 = 1, v1 = 0] = keys[i + 1] ?? [];
  const u = (t - t0) / (t1 - t0);
  const eased = u <= 0 ? 0 : u * u * (3 - 2 * u);
  return v0 + (v1 - v0) * eased;
}

export function emptyClip(loop: boolean): RawClip {
  return { loop, markers: {}, channels: {} };
}

/** Dwie klatki o tej samej wartości na 0 i 1 to stała: wystarcza jedna klatka. */
function collapsed(keys: Key[]): Key[] {
  const [first, second] = keys;
  if (keys.length === 2 && first !== undefined && second !== undefined && first[1] === second[1]) {
    return [first];
  }
  return keys;
}

function withChannel(clip: RawClip, channel: string, keys: readonly Key[] | null): RawClip {
  const channels: RawClip['channels'] = {};
  for (const [name, existing] of Object.entries(clip.channels)) {
    if (name !== channel) channels[name] = existing;
    else if (keys !== null) channels[name] = keys.map(([time, value]) => [time, value]);
  }
  if (keys !== null && clip.channels[channel] === undefined) {
    channels[channel] = keys.map(([time, value]) => [time, value]);
  }
  return { ...clip, channels };
}

/**
 * Ustawia wartość kanału w chwili `t`: zmienia klatkę, która tam jest, albo dodaje nową.
 * `base` to wartość, którą kanał miał dotąd na końcach klipu (postawa albo 0); dostają ją
 * klatki 0 i 1 tworzone razem z pierwszą klatką w środku klipu.
 */
export function setKey(
  clip: RawClip,
  channel: string,
  time: number,
  value: number,
  base: number,
): RawClip {
  const t = snapTime(time);
  const keys: Key[] = (clip.channels[channel] ?? []).map(([kt, kv]) => [kt, kv]);
  if (keys.length === 0 && t > 0) keys.push([0, base]);

  const index = keyIndexAt(keys, t);
  if (index >= 0) {
    keys[index] = [t, value];
  } else {
    keys.push([t, value]);
    keys.sort((a, b) => a[0] - b[0]);
  }

  const first = keys[0];
  let last = keys[keys.length - 1];
  if (first === undefined || last === undefined) return clip;
  // Kanał z więcej niż jedną klatką musi kończyć się w 1; wraca do wartości początkowej.
  if (keys.length > 1 && last[0] !== 1) {
    last = [1, first[1]];
    keys.push(last);
  }
  if (clip.loop && keys.length > 1) {
    // Końce pętli są jedną klatką: edycja jednego zmienia oba.
    if (t === 0) keys[keys.length - 1] = [1, value];
    else if (t === 1) keys[0] = [0, value];
  }
  return withChannel(clip, channel, collapsed(keys));
}

/** Klatki na końcach da się usunąć dopiero wtedy, gdy kanał nie ma klatek w środku. */
export function canRemoveKey(clip: RawClip, channel: string, time: number): boolean {
  const keys = clip.channels[channel];
  if (keys === undefined) return false;
  const index = keyIndexAt(keys, snapTime(time));
  if (index < 0) return false;
  return keys.length <= 2 || (index > 0 && index < keys.length - 1);
}

/** Usuwa klatkę w chwili `t`. Usunięcie ostatniej klatki przywraca kanałowi wartość z postawy. */
export function removeKey(clip: RawClip, channel: string, time: number): RawClip {
  if (!canRemoveKey(clip, channel, time)) return clip;
  const keys = clip.channels[channel] ?? [];
  const index = keyIndexAt(keys, snapTime(time));
  const rest: Key[] = keys.filter((_, i) => i !== index).map(([kt, kv]) => [kt, kv]);
  if (rest.length === 0) return withChannel(clip, channel, null);
  // Została jedna z dwóch klatek końcowych: staje się stałą wartością kanału.
  const only = rest[0];
  if (rest.length === 1 && only !== undefined) return withChannel(clip, channel, [[0, only[1]]]);
  return withChannel(clip, channel, collapsed(rest));
}

/**
 * Przesuwa klatkę ze środka klipu na inny czas, między sąsiednie klatki. Klatek 0 i 1
 * nie da się przesunąć.
 */
export function moveKey(clip: RawClip, channel: string, from: number, to: number): RawClip {
  const keys = clip.channels[channel];
  if (keys === undefined) return clip;
  const index = keyIndexAt(keys, snapTime(from));
  if (index <= 0 || index >= keys.length - 1) return clip;
  const before = keys[index - 1]?.[0] ?? 0;
  const after = keys[index + 1]?.[0] ?? 1;
  const t = Math.min(
    snapTime(after - TIME_STEP),
    Math.max(snapTime(before + TIME_STEP), snapTime(to)),
  );
  const moved: Key[] = keys.map(([kt, kv], i) => (i === index ? [t, kv] : [kt, kv]));
  return withChannel(clip, channel, moved);
}

/** Włącza lub wyłącza pętlę. Włączenie wyrównuje wartość końcową każdego kanału do początkowej. */
export function setLoop(clip: RawClip, loop: boolean): RawClip {
  if (!loop) return { ...clip, loop };
  let next: RawClip = { ...clip, loop };
  for (const [channel, keys] of Object.entries(clip.channels)) {
    const first = keys[0];
    if (keys.length < 2 || first === undefined) continue;
    const aligned: Key[] = keys.map(([kt, kv], i) =>
      i === keys.length - 1 ? [kt, first[1]] : [kt, kv],
    );
    next = withChannel(next, channel, collapsed(aligned));
  }
  return next;
}

const MARKER_NAME = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function isValidMarkerName(name: string): boolean {
  return MARKER_NAME.test(name);
}

export function setMarker(clip: RawClip, name: string, time: number): RawClip {
  if (!isValidMarkerName(name)) return clip;
  return { ...clip, markers: { ...clip.markers, [name]: snapTime(time) } };
}

export function removeMarker(clip: RawClip, name: string): RawClip {
  const markers: Record<string, number> = {};
  for (const [key, value] of Object.entries(clip.markers)) {
    if (key !== name) markers[key] = value;
  }
  return { ...clip, markers };
}

/** Czasy wszystkich klatek klipu, rosnąco i bez powtórzeń: punkty zatrzymania na osi czasu. */
export function keyTimes(clip: RawClip): number[] {
  const times = new Set<number>();
  for (const keys of Object.values(clip.channels)) {
    for (const [time] of keys) times.add(time);
  }
  return [...times].sort((a, b) => a - b);
}
