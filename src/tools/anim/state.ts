// Stan edytora animacji w sygnałach i akcje, które go zmieniają. Bez DOM: logikę da się
// testować w Node, a panel (AnimPanel.tsx) i podgląd (preview.ts) tylko czytają sygnały.
import { computed, type ReadonlySignal, type Signal, signal } from '@preact/signals';
import { type RawContent, rawContent } from '../../content/load.ts';
import { type RawClip, type RawRig, ROOT_CHANNELS } from '../../content/schema-rig.ts';
import { validateContent } from '../../content/validate.ts';
import {
  canRemoveKey,
  emptyClip,
  isValidMarkerName,
  keyIndexAt,
  keyTimes,
  moveKey,
  removeKey,
  removeMarker,
  sampleKeys,
  setKey,
  setLoop,
  setMarker,
  snapTime,
} from './clip-edit.ts';
import { exportClip, importClip } from './clip-io.ts';

export interface ChannelInfo {
  readonly id: string;
  /** Kość (kąt w stopniach) albo przesunięcie korzenia (jednostki rigu). */
  readonly isBone: boolean;
  /** Wartość kanału, gdy klip go nie animuje: kąt z postawy albo 0. */
  readonly rest: number;
}

export interface AnimEditor {
  readonly rigIds: readonly string[];
  readonly rigId: Signal<string>;
  readonly skin: Signal<string>;
  readonly stance: Signal<string>;
  readonly clipName: Signal<string>;
  /** Klipy bieżącego rigu razem z niezapisanymi zmianami. */
  readonly clips: Signal<Readonly<Record<string, RawClip>>>;
  /** Pozycja na osi czasu, 0..1. */
  readonly time: Signal<number>;
  readonly playing: Signal<boolean>;
  /** Czas trwania klipu w podglądzie, w sekundach; w grze wyznacza go atak albo tempo chodu. */
  readonly duration: Signal<number>;
  readonly pivots: Signal<boolean>;

  /** Rig z treści gry z podmienionymi klipami z edytora. */
  readonly rig: ReadonlySignal<RawRig>;
  readonly clip: ReadonlySignal<RawClip>;
  readonly channels: ReadonlySignal<readonly ChannelInfo[]>;
  /** Problemy, które zgłosiłby `pnpm validate-content` po wklejeniu klipów do pliku rigu. */
  readonly issues: ReadonlySignal<readonly string[]>;
  readonly exportText: ReadonlySignal<string>;
  /** Klip różni się od wersji w treści gry. */
  readonly dirty: ReadonlySignal<boolean>;

  selectRig(id: string): void;
  selectClip(name: string): void;
  /** Zakłada pusty klip; zwraca komunikat błędu albo null. */
  newClip(name: string): string | null;
  /** Przywraca klip z treści gry (albo usuwa klip, którego w niej nie ma). */
  resetClip(): void;
  setTime(time: number): void;
  /** Skacze do sąsiedniej klatki kluczowej w podanym kierunku. */
  stepKey(direction: 1 | -1): void;
  valueAt(channel: ChannelInfo): number;
  hasKey(channel: string): boolean;
  canRemoveKey(channel: string): boolean;
  /** Ustawia wartość kanału w bieżącym czasie, tworząc klatkę, jeśli jej tam nie ma. */
  setValue(channel: ChannelInfo, value: number): void;
  /** Dodaje klatkę z bieżącą wartością albo usuwa klatkę, która jest w bieżącym czasie. */
  toggleKey(channel: ChannelInfo): void;
  /** Przesuwa klatkę ze środka klipu; bieżący czas ustawia na jej nowym miejscu. */
  moveKey(channel: string, from: number, to: number): void;
  setLoop(loop: boolean): void;
  addMarker(name: string): string | null;
  removeMarker(name: string): void;
  /** Wczytuje klip z tekstu; zwraca komunikat błędu albo null. */
  importText(text: string): string | null;
}

const CLIP_NAME = /^[a-zA-Z][a-zA-Z0-9_]*$/;

function firstKey(record: Readonly<Record<string, unknown>>, preferred: string): string {
  return preferred in record ? preferred : (Object.keys(record)[0] ?? '');
}

/**
 * `skinsOf` podaje skórki z atlasu, które mają komplet części rigu. `raw` to surowa treść gry,
 * z której edytor bierze rigi i do której odnosi walidację.
 */
export function createAnimEditor(
  rigs: ReadonlyMap<string, RawRig>,
  skinsOf: (rig: RawRig) => readonly string[],
  raw: RawContent = rawContent,
): AnimEditor {
  const rigIds = [...rigs.keys()];
  const baseRig = (id: string): RawRig => {
    const rig = rigs.get(id);
    if (rig === undefined) throw new Error(`Unknown rig "${id}"`);
    return rig;
  };

  const rigId = signal(rigIds[0] ?? '');
  const initial = baseRig(rigId.value);
  const skin = signal(skinsOf(initial)[0] ?? '');
  const stance = signal(firstKey(initial.stances, ''));
  const clipName = signal(firstKey(initial.clips, 'idle'));
  const clips = signal<Readonly<Record<string, RawClip>>>(initial.clips);
  const time = signal(0);
  const playing = signal(false);
  const duration = signal(1);
  const pivots = signal(false);

  const rig = computed<RawRig>(() => ({ ...baseRig(rigId.value), clips: clips.value }));
  const clip = computed<RawClip>(() => clips.value[clipName.value] ?? emptyClip(false));
  const channels = computed<readonly ChannelInfo[]>(() => {
    const angles = rig.value.stances[stance.value] ?? {};
    return [
      ...rig.value.bones.map((bone) => ({ id: bone.id, isBone: true, rest: angles[bone.id] ?? 0 })),
      ...ROOT_CHANNELS.map((id) => ({ id, isBone: false, rest: 0 })),
    ];
  });
  const issues = computed(() =>
    validateContent({ ...raw, rigs: { ...raw.rigs, [rigId.value]: rig.value } }).map(
      (issue) => `${issue.source}: ${issue.message}`,
    ),
  );
  const exportText = computed(() => exportClip(clipName.value, clip.value));
  const dirty = computed(() => clip.value !== baseRig(rigId.value).clips[clipName.value]);

  const update = (next: RawClip): void => {
    if (next !== clip.value) clips.value = { ...clips.value, [clipName.value]: next };
  };

  return {
    rigIds,
    rigId,
    skin,
    stance,
    clipName,
    clips,
    time,
    playing,
    duration,
    pivots,
    rig,
    clip,
    channels,
    issues,
    exportText,
    dirty,

    selectRig(id) {
      const next = baseRig(id);
      rigId.value = id;
      clips.value = next.clips;
      skin.value = skinsOf(next)[0] ?? '';
      stance.value = firstKey(next.stances, stance.value);
      clipName.value = firstKey(next.clips, 'idle');
      time.value = 0;
    },
    selectClip(name) {
      if (clips.value[name] === undefined) return;
      clipName.value = name;
      time.value = 0;
    },
    newClip(name) {
      if (!CLIP_NAME.test(name)) return 'nazwa klipu: litery, cyfry i podkreślenia, od litery';
      if (clips.value[name] !== undefined) return `klip "${name}" już istnieje`;
      clips.value = { ...clips.value, [name]: emptyClip(false) };
      clipName.value = name;
      time.value = 0;
      return null;
    },
    resetClip() {
      const original = baseRig(rigId.value).clips[clipName.value];
      if (original !== undefined) {
        clips.value = { ...clips.value, [clipName.value]: original };
        return;
      }
      const rest: Record<string, RawClip> = {};
      for (const [name, value] of Object.entries(clips.value)) {
        if (name !== clipName.value) rest[name] = value;
      }
      clips.value = rest;
      clipName.value = firstKey(rest, 'idle');
      time.value = 0;
    },
    setTime(next) {
      time.value = snapTime(next);
    },
    stepKey(direction) {
      const times = keyTimes(clip.value);
      const now = time.value;
      const target =
        direction > 0 ? times.find((t) => t > now) : [...times].reverse().find((t) => t < now);
      if (target !== undefined) time.value = target;
    },
    valueAt(channel) {
      return sampleKeys(clip.value.channels[channel.id], time.value, channel.rest);
    },
    hasKey(channel) {
      return keyIndexAt(clip.value.channels[channel] ?? [], time.value) >= 0;
    },
    canRemoveKey(channel) {
      return canRemoveKey(clip.value, channel, time.value);
    },
    setValue(channel, value) {
      playing.value = false;
      update(setKey(clip.value, channel.id, time.value, value, channel.rest));
    },
    toggleKey(channel) {
      playing.value = false;
      if (keyIndexAt(clip.value.channels[channel.id] ?? [], time.value) >= 0) {
        update(removeKey(clip.value, channel.id, time.value));
      } else {
        const value = sampleKeys(clip.value.channels[channel.id], time.value, channel.rest);
        update(setKey(clip.value, channel.id, time.value, value, channel.rest));
      }
    },
    moveKey(channel, from, to) {
      const index = keyIndexAt(clip.value.channels[channel] ?? [], snapTime(from));
      if (index < 0) return;
      const next = moveKey(clip.value, channel, from, to);
      update(next);
      // Bieżący czas idzie razem z przesuwaną klatką.
      const moved = next.channels[channel]?.[index]?.[0];
      if (moved !== undefined) time.value = moved;
    },
    setLoop(loop) {
      update(setLoop(clip.value, loop));
    },
    addMarker(name) {
      if (!isValidMarkerName(name))
        return 'nazwa znacznika: litery, cyfry i podkreślenia, od litery';
      update(setMarker(clip.value, name, time.value));
      return null;
    },
    removeMarker(name) {
      update(removeMarker(clip.value, name));
    },
    importText(text) {
      const result = importClip(
        text,
        channels.value.map((channel) => channel.id),
      );
      if (!result.ok) return result.error;
      const name = result.name ?? clipName.value;
      if (!CLIP_NAME.test(name)) return 'nazwa klipu: litery, cyfry i podkreślenia, od litery';
      clips.value = { ...clips.value, [name]: result.clip };
      clipName.value = name;
      time.value = 0;
      return null;
    },
  };
}
