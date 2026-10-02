import { describe, expect, it } from 'vitest';
import { rawContent, requireContent } from '../../content/load.ts';
import type { RawClip } from '../../content/schema-rig.ts';
import { validateContent } from '../../content/validate.ts';
import { compileClip, sampleClip } from '../../render/clips.ts';
import {
  canRemoveKey,
  emptyClip,
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

const humanoid = requireContent().rigs.get('humanoid');
if (humanoid === undefined) throw new Error('rig humanoid is missing');

describe('snapTime i keyIndexAt', () => {
  it('przyciąga czas do tysięcznych i przycina do 0..1', () => {
    expect(snapTime(0.1 + 0.2)).toBe(0.3);
    expect(snapTime(0.2504)).toBe(0.25);
    expect(snapTime(-0.2)).toBe(0);
    expect(snapTime(1.7)).toBe(1);
  });

  it('znajduje klatkę o danym czasie', () => {
    const keys = [
      [0, 1],
      [0.25, 2],
      [1, 1],
    ] as const;
    expect(keyIndexAt(keys, 0.25)).toBe(1);
    expect(keyIndexAt(keys, 0.2504)).toBe(1);
    expect(keyIndexAt(keys, 0.26)).toBe(-1);
  });
});

describe('setKey', () => {
  it('pierwsza klatka w środku klipu dostaje klatki 0 i 1 o wartości z postawy', () => {
    const clip = setKey(emptyClip(false), 'armF', 0.4, -170, -10);
    expect(clip.channels.armF).toEqual([
      [0, -10],
      [0.4, -170],
      [1, -10],
    ]);
  });

  it('pierwsza klatka w czasie 0 tworzy kanał stały', () => {
    expect(setKey(emptyClip(true), 'torso', 0, 6, 0).channels.torso).toEqual([[0, 6]]);
  });

  it('zmienia wartość istniejącej klatki zamiast dodawać drugą', () => {
    let clip = setKey(emptyClip(false), 'armF', 0.4, -170, 0);
    clip = setKey(clip, 'armF', 0.4, -150, 0);
    expect(clip.channels.armF).toEqual([
      [0, 0],
      [0.4, -150],
      [1, 0],
    ]);
  });

  it('wstawia klatki w kolejności czasu', () => {
    let clip = setKey(emptyClip(false), 'dx', 0.7, 6, 0);
    clip = setKey(clip, 'dx', 0.4, -3, 0);
    expect(clip.channels.dx?.map(([time]) => time)).toEqual([0, 0.4, 0.7, 1]);
  });

  it('w klipie zapętlonym końce są jedną klatką', () => {
    let clip = setKey(emptyClip(true), 'thighF', 0.5, 25, 0);
    clip = setKey(clip, 'thighF', 0, -30, 0);
    expect(clip.channels.thighF).toEqual([
      [0, -30],
      [0.5, 25],
      [1, -30],
    ]);
    clip = setKey(clip, 'thighF', 1, -20, 0);
    expect(clip.channels.thighF?.[0]).toEqual([0, -20]);
  });

  it('w klipie jednorazowym koniec może różnić się od początku', () => {
    let clip = setKey(emptyClip(false), 'dx', 0, 0, 0);
    clip = setKey(clip, 'dx', 1, 5, 0);
    expect(clip.channels.dx).toEqual([
      [0, 0],
      [1, 5],
    ]);
  });

  it('dwie równe klatki na końcach zwija do jednej', () => {
    let clip = setKey(emptyClip(false), 'head', 0, -3, 0);
    clip = setKey(clip, 'head', 1, -3, 0);
    expect(clip.channels.head).toEqual([[0, -3]]);
  });

  it('nie zmienia klipu wejściowego', () => {
    const clip = setKey(emptyClip(false), 'head', 0, 1, 0);
    setKey(clip, 'head', 0.5, 9, 0);
    expect(clip.channels.head).toEqual([[0, 1]]);
  });
});

describe('removeKey', () => {
  const clip = setKey(setKey(emptyClip(false), 'armF', 0.4, -170, -10), 'armF', 0.6, -60, -10);

  it('usuwa klatkę ze środka', () => {
    expect(removeKey(clip, 'armF', 0.4).channels.armF?.map(([time]) => time)).toEqual([0, 0.6, 1]);
  });

  it('nie usuwa klatek końcowych, dopóki są klatki w środku', () => {
    expect(canRemoveKey(clip, 'armF', 0)).toBe(false);
    expect(canRemoveKey(clip, 'armF', 1)).toBe(false);
    expect(removeKey(clip, 'armF', 0)).toBe(clip);
  });

  it('po usunięciu ostatniej klatki ze środka zostaje stała, a po usunięciu jej znika kanał', () => {
    const constant = removeKey(removeKey(clip, 'armF', 0.4), 'armF', 0.6);
    expect(constant.channels.armF).toEqual([[0, -10]]);
    expect(canRemoveKey(constant, 'armF', 0)).toBe(true);
    expect(removeKey(constant, 'armF', 0).channels.armF).toBeUndefined();
  });

  it('z dwóch klatek końcowych zostawia drugą jako stałą', () => {
    const ends = setKey(setKey(emptyClip(false), 'dx', 0, 0, 0), 'dx', 1, 5, 0);
    expect(removeKey(ends, 'dx', 1).channels.dx).toEqual([[0, 0]]);
    expect(removeKey(ends, 'dx', 0).channels.dx).toEqual([[0, 5]]);
  });

  it('ignoruje czas bez klatki i nieznany kanał', () => {
    expect(removeKey(clip, 'armF', 0.5)).toBe(clip);
    expect(removeKey(clip, 'torso', 0)).toBe(clip);
  });
});

describe('moveKey', () => {
  const clip = setKey(setKey(emptyClip(false), 'armF', 0.4, -170, 0), 'armF', 0.6, -60, 0);

  it('przesuwa klatkę ze środka', () => {
    expect(moveKey(clip, 'armF', 0.4, 0.3).channels.armF?.[1]).toEqual([0.3, -170]);
  });

  it('zatrzymuje klatkę przed sąsiadami', () => {
    expect(moveKey(clip, 'armF', 0.4, 0.9).channels.armF?.[1]?.[0]).toBe(0.599);
    expect(moveKey(clip, 'armF', 0.6, 0).channels.armF?.[2]?.[0]).toBe(0.401);
  });

  it('nie przesuwa klatek końcowych', () => {
    expect(moveKey(clip, 'armF', 0, 0.2)).toBe(clip);
    expect(moveKey(clip, 'armF', 1, 0.8)).toBe(clip);
  });
});

describe('setLoop i znaczniki', () => {
  it('włączenie pętli wyrównuje koniec do początku', () => {
    let clip = setKey(setKey(emptyClip(false), 'dx', 0, 0, 0), 'dx', 1, 5, 0);
    clip = setKey(clip, 'dx', 0.5, 3, 0);
    const looped = setLoop(clip, true);
    expect(looped.loop).toBe(true);
    expect(looped.channels.dx).toEqual([
      [0, 0],
      [0.5, 3],
      [1, 0],
    ]);
    expect(setLoop(looped, false).channels.dx).toEqual(looped.channels.dx);
  });

  it('dodaje, przesuwa i usuwa znacznik; odrzuca złą nazwę', () => {
    let clip = setMarker(emptyClip(false), 'hit', 0.5004);
    expect(clip.markers).toEqual({ hit: 0.5 });
    clip = setMarker(clip, 'hit', 0.52);
    expect(clip.markers.hit).toBe(0.52);
    expect(setMarker(clip, '2 fast', 0.1)).toBe(clip);
    expect(removeMarker(clip, 'hit').markers).toEqual({});
  });

  it('keyTimes podaje czasy wszystkich klatek bez powtórzeń', () => {
    expect(keyTimes(humanoid.clips.walk as RawClip)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

describe('zgodność z rendererem i walidatorem', () => {
  const channels = [...humanoid.bones.map((bone) => bone.id), 'bob', 'dx'];

  it('sampleKeys daje te same wartości co sampleClip renderera', () => {
    for (const clip of Object.values(humanoid.clips)) {
      const compiled = compileClip(clip, channels, humanoid.bones.length);
      const rest = new Float32Array(channels.length);
      const out = new Float32Array(channels.length);
      for (const t of [0, 0.1, 0.25, 0.4, 0.5, 0.52, 0.77, 1]) {
        sampleClip(compiled, t, rest, out, 0);
        channels.forEach((channel, index) => {
          const raw = sampleKeys(clip.channels[channel], t, 0);
          const expected = index < humanoid.bones.length ? (raw * Math.PI) / 180 : raw;
          expect(out[index], `${channel} @ ${t}`).toBeCloseTo(expected, 4);
        });
      }
    }
  });

  it('każdy klip rigu da się odtworzyć od zera operacją setKey', () => {
    for (const [name, original] of Object.entries(humanoid.clips)) {
      let clip = emptyClip(original.loop);
      for (const [channel, keys] of Object.entries(original.channels)) {
        // Kolejność jak przy pracy w edytorze: najpierw końce, potem środek.
        const ordered = [...keys].sort((a, b) => Number(a[0] % 1 !== 0) - Number(b[0] % 1 !== 0));
        for (const [time, value] of ordered) clip = setKey(clip, channel, time, value, 0);
      }
      for (const [marker, time] of Object.entries(original.markers)) {
        clip = setMarker(clip, marker, time);
      }
      expect(clip, name).toEqual(original);
    }
  });

  it('klip po dowolnych edycjach przechodzi walidację treści', () => {
    const walk = humanoid.clips.walk as RawClip;
    let clip = setKey(walk, 'head', 0.33, 12, 0);
    clip = setKey(clip, 'weapon', 0.5, -40, -75);
    clip = setKey(clip, 'bob', 1, -1, 0);
    clip = removeKey(clip, 'shinF', 0.75);
    clip = moveKey(clip, 'shinB', 0.25, 0.3);
    const rig = { ...humanoid, clips: { ...humanoid.clips, walk: clip } };
    expect(validateContent({ ...rawContent, rigs: { humanoid: rig } })).toEqual([]);
  });
});
