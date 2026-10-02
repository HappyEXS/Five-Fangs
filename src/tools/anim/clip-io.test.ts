import { describe, expect, it } from 'vitest';
import { rawContent, requireContent } from '../../content/load.ts';
import { validateContent } from '../../content/validate.ts';
import { emptyClip, setKey, setMarker } from './clip-edit.ts';
import { exportClip, importClip, tidyClip } from './clip-io.ts';

const humanoid = requireContent().rigs.get('humanoid');
if (humanoid === undefined) throw new Error('rig humanoid is missing');
const channels = [...humanoid.bones.map((bone) => bone.id), 'bob', 'dx'];

describe('exportClip', () => {
  it('zapisuje klip w układzie pliku rigu', () => {
    let clip = setKey(emptyClip(false), 'torso', 0, 4, 0);
    clip = setKey(clip, 'armF', 0.4, -170, -10);
    clip = setMarker(clip, 'hit', 0.5);
    expect(exportClip('slash', clip)).toBe(
      [
        '    "slash": {',
        '      "loop": false,',
        '      "markers": { "hit": 0.5 },',
        '      "channels": {',
        '        "torso": [[0, 4]],',
        '        "armF": [[0, -10], [0.4, -170], [1, -10]]',
        '      }',
        '    }',
      ].join('\n'),
    );
  });

  it('pomija puste znaczniki i zaokrągla wartości do setnych', () => {
    const clip = setKey(emptyClip(true), 'bob', 0, -2.4999999, 0);
    const text = exportClip('idle', clip);
    expect(text).not.toContain('markers');
    expect(text).toContain('"bob": [[0, -2.5]]');
    expect(tidyClip(setKey(emptyClip(true), 'bob', 0, -0.001, 0)).channels.bob).toEqual([[0, 0]]);
  });
});

describe('importClip', () => {
  it('czyta wpis wyeksportowany przez edytor, z nazwą', () => {
    for (const [name, clip] of Object.entries(humanoid.clips)) {
      const result = importClip(exportClip(name, clip), channels);
      expect(result).toEqual({ ok: true, name, clip });
    }
  });

  it('czyta sam obiekt klipu, wpis w klamrach i wpis z przecinkiem na końcu', () => {
    const bare = importClip('{ "loop": true, "channels": { "torso": [[0, 6]] } }', channels);
    expect(bare).toEqual({
      ok: true,
      name: null,
      clip: { loop: true, markers: {}, channels: { torso: [[0, 6]] } },
    });
    const wrapped = importClip(
      '{ "nod": { "loop": true, "channels": { "head": [[0, 3]] } } }',
      channels,
    );
    expect(wrapped.ok && wrapped.name).toBe('nod');
    const fragment = importClip(
      '"nod": { "loop": true, "channels": { "head": [[0, 3]] } },',
      channels,
    );
    expect(fragment.ok && fragment.name).toBe('nod');
  });

  it('odrzuca zły JSON, zły kształt i nieznany kanał', () => {
    expect(importClip('{ loop: true', channels)).toEqual({
      ok: false,
      error: 'to nie jest poprawny JSON',
    });
    expect(importClip('[1, 2]', channels).ok).toBe(false);
    expect(importClip('{ "loop": true }', channels).ok).toBe(false);
    const result = importClip('{ "loop": true, "channels": { "tail": [[0, 1]] } }', channels);
    expect(result).toEqual({ ok: false, error: 'nieznane kanały: tail' });
  });
});

describe('eksport a walidacja treści', () => {
  it('klip zbudowany w edytorze i wklejony do rigu przechodzi validate-content', () => {
    let clip = emptyClip(false);
    clip = setKey(clip, 'armF', 0.4, -169.999, -10);
    clip = setKey(clip, 'armF', 0.52, -60, -10);
    clip = setKey(clip, 'dx', 0.52, 7.004, 0);
    clip = setMarker(clip, 'hit', 0.5);

    // Tekst z edytora wklejony do obiektu "clips" pliku rigu w miejsce klipu slash.
    const pasted: unknown = JSON.parse(`{${exportClip('slash', clip)}}`);
    const rig = { ...humanoid, clips: { ...humanoid.clips, ...(pasted as object) } };
    expect(validateContent({ ...rawContent, rigs: { humanoid: rig } })).toEqual([]);
  });
});
