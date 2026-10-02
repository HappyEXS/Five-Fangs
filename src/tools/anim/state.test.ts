import { describe, expect, it } from 'vitest';
import { requireContent } from '../../content/load.ts';
import { type AnimEditor, createAnimEditor } from './state.ts';

const rigs = requireContent().rigs;

function editor(): AnimEditor {
  return createAnimEditor(rigs, () => ['swordsman_a', 'archer_a']);
}

function channel(e: AnimEditor, id: string) {
  const found = e.channels.value.find((c) => c.id === id);
  if (found === undefined) throw new Error(`missing channel ${id}`);
  return found;
}

describe('stan edytora animacji', () => {
  it('startuje na pierwszym rigu, jego pierwszej skórce i klipie idle, bez problemów walidacji', () => {
    const e = editor();
    expect(e.rigId.value).toBe('humanoid');
    expect(e.skin.value).toBe('swordsman_a');
    expect(e.clipName.value).toBe('idle');
    expect(e.channels.value.map((c) => c.id).slice(-2)).toEqual(['bob', 'dx']);
    expect(e.issues.value).toEqual([]);
    expect(e.dirty.value).toBe(false);
  });

  it('wartość spoczynkowa kanału pochodzi z wybranej postawy', () => {
    const e = editor();
    e.stance.value = 'sword';
    expect(channel(e, 'weapon').rest).toBe(-75);
    e.stance.value = 'bow';
    expect(channel(e, 'weapon').rest).toBe(-30);
    expect(channel(e, 'dx').rest).toBe(0);
  });

  it('suwak tworzy klatkę w bieżącym czasie i zatrzymuje odtwarzanie', () => {
    const e = editor();
    e.selectClip('walk');
    e.playing.value = true;
    e.setTime(0.3);
    expect(e.valueAt(channel(e, 'head'))).toBe(-3);
    e.setValue(channel(e, 'head'), 20);
    expect(e.playing.value).toBe(false);
    expect(e.clip.value.channels.head).toEqual([
      [0, -3],
      [0.3, 20],
      [1, -3],
    ]);
    expect(e.hasKey('head')).toBe(true);
    expect(e.dirty.value).toBe(true);
    expect(e.issues.value).toEqual([]);
  });

  it('przycisk klatki dodaje ją z bieżącą wartością, a ponownie naciśnięty usuwa', () => {
    const e = editor();
    e.selectClip('walk');
    e.setTime(0.25);
    const thigh = channel(e, 'thighF');
    const before = e.valueAt(thigh);
    e.toggleKey(thigh);
    expect(e.clip.value.channels.thighF).toContainEqual([0.25, before]);
    e.toggleKey(thigh);
    expect(e.clip.value.channels.thighF?.map(([time]) => time)).toEqual([0, 0.5, 1]);
    e.setTime(0);
    expect(e.canRemoveKey('thighF')).toBe(false);
  });

  it('przesunięcie klatki zabiera ze sobą bieżący czas', () => {
    const e = editor();
    e.selectClip('walk');
    e.setTime(0.75);
    e.moveKey('shinF', 0.75, 0.8);
    expect(e.time.value).toBe(0.8);
    expect(e.clip.value.channels.shinF?.[2]).toEqual([0.8, 50]);
  });

  it('skacze po klatkach kluczowych klipu', () => {
    const e = editor();
    e.selectClip('walk');
    e.stepKey(1);
    expect(e.time.value).toBe(0.25);
    e.stepKey(1);
    e.stepKey(-1);
    expect(e.time.value).toBe(0.25);
    e.setTime(1);
    e.stepKey(1);
    expect(e.time.value).toBe(1);
  });

  it('zmiana klipu nie gubi zmian w poprzednim; „przywróć” wraca do treści gry', () => {
    const e = editor();
    e.selectClip('walk');
    e.setValue(channel(e, 'torso'), 10);
    e.selectClip('idle');
    e.selectClip('walk');
    expect(e.clip.value.channels.torso).toEqual([[0, 10]]);
    e.resetClip();
    expect(e.clip.value.channels.torso).toEqual([[0, 6]]);
    expect(e.dirty.value).toBe(false);
  });

  it('zakłada nowy klip, a „przywróć” go usuwa', () => {
    const e = editor();
    expect(e.newClip('2fast')).toMatch(/nazwa klipu/);
    expect(e.newClip('walk')).toMatch(/już istnieje/);
    expect(e.newClip('wave')).toBeNull();
    expect(e.clipName.value).toBe('wave');
    expect(e.exportText.value).toContain('"wave": {');
    e.resetClip();
    expect(Object.keys(e.clips.value)).not.toContain('wave');
    expect(e.clipName.value).toBe('idle');
  });

  it('znacznik hit niezgodny z atakiem pojawia się w walidacji', () => {
    const e = editor();
    e.selectClip('slash');
    e.setTime(0.6);
    expect(e.addMarker('hit')).toBeNull();
    expect(e.issues.value.some((issue) => issue.includes('hitFraction'))).toBe(true);
    e.setTime(0.5);
    e.addMarker('hit');
    expect(e.issues.value).toEqual([]);
    expect(e.addMarker('nie tak')).toMatch(/nazwa znacznika/);
    e.addMarker('whoosh');
    e.removeMarker('whoosh');
    expect(e.clip.value.markers).toEqual({ hit: 0.5 });
  });

  it('importuje klip pod nazwą z tekstu albo w miejsce bieżącego', () => {
    const e = editor();
    expect(e.importText('{ nie json')).toBe('to nie jest poprawny JSON');
    expect(e.importText('"nod": { "loop": true, "channels": { "head": [[0, 3]] } }')).toBeNull();
    expect(e.clipName.value).toBe('nod');
    expect(e.importText('{ "loop": true, "channels": { "head": [[0, 9]] } }')).toBeNull();
    expect(e.clips.value.nod?.channels.head).toEqual([[0, 9]]);
  });

  it('pętla wyrównuje końce kanałów bieżącego klipu', () => {
    const e = editor();
    e.newClip('bow_down');
    e.setTime(1);
    e.setValue(channel(e, 'torso'), 30);
    expect(e.clip.value.channels.torso).toEqual([
      [0, 0],
      [1, 30],
    ]);
    e.setLoop(true);
    expect(e.clip.value.loop).toBe(true);
    expect(e.clip.value.channels.torso).toEqual([[0, 0]]);
  });
});
