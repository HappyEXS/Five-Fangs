import { describe, expect, it } from 'vitest';
import {
  atlasManifestSchema,
  isValidSpriteName,
  resolvePivots,
  spriteNameOf,
} from './atlas-source.ts';

describe('spriteNameOf', () => {
  it('zamienia ścieżkę pliku PNG na nazwę sprite’a, także z separatorami Windows', () => {
    expect(spriteNameOf('swordsman_a/torso.png')).toBe('swordsman_a/torso');
    expect(spriteNameOf('fx\\arrow.png')).toBe('fx/arrow');
  });

  it('pomija pliki inne niż PNG', () => {
    expect(spriteNameOf('atlas.json')).toBeNull();
    expect(spriteNameOf('notes/readme.txt')).toBeNull();
  });
});

describe('isValidSpriteName', () => {
  it('dopuszcza małe litery, cyfry i podkreślenia w segmentach ścieżki', () => {
    expect(isValidSpriteName('fx/dmg_0')).toBe(true);
    expect(isValidSpriteName('arrow')).toBe(true);
    expect(isValidSpriteName('Swordsman/torso')).toBe(false);
    expect(isValidSpriteName('fx/big arrow')).toBe(false);
    expect(isValidSpriteName('fx//arrow')).toBe(false);
  });
});

describe('atlasManifestSchema', () => {
  it('uzupełnia domyślne ustawienia kodowania', () => {
    const manifest = atlasManifestSchema.parse({ pixelsPerUnit: 3, pivots: { a: [1, 2] } });
    expect(manifest.lossless).toBe(true);
    expect(manifest.quality).toBe(90);
    expect(manifest.generator).toBeUndefined();
  });

  it('odrzuca nieznane pola i niecałkowitą gęstość pikseli', () => {
    expect(atlasManifestSchema.safeParse({ pixelsPerUnit: 3, pivots: {}, pivot: {} }).success).toBe(
      false,
    );
    expect(atlasManifestSchema.safeParse({ pixelsPerUnit: 2.5, pivots: {} }).success).toBe(false);
    expect(atlasManifestSchema.safeParse({ pixelsPerUnit: 3, pivots: { a: [1] } }).success).toBe(
      false,
    );
  });
});

describe('resolvePivots', () => {
  it('dokładna nazwa ma pierwszeństwo przed wzorcem części', () => {
    const { pivots, problems } = resolvePivots(
      { pivots: { '*/torso': [10, 26], 'brute/torso': [12, 30] } },
      ['brute/torso', 'swordsman_a/torso'],
    );
    expect(problems).toEqual([]);
    expect(pivots.get('brute/torso')).toEqual([12, 30]);
    expect(pivots.get('swordsman_a/torso')).toEqual([10, 26]);
  });

  it('zgłasza sprite bez pivota', () => {
    const { pivots, problems } = resolvePivots({ pivots: { '*/torso': [10, 26] } }, [
      'a/torso',
      'a/head',
    ]);
    expect(pivots.has('a/head')).toBe(false);
    expect(problems).toEqual(['sprite "a/head" nie ma pivota w atlas.json']);
  });

  it('zgłasza wpis, który nie pasuje do żadnego pliku', () => {
    const { problems } = resolvePivots({ pivots: { 'a/torso': [1, 1], 'a/tors': [1, 1] } }, [
      'a/torso',
    ]);
    expect(problems).toEqual(['pivot "a/tors" nie pasuje do żadnego pliku']);
  });

  it('wzorzec dotyczy ostatniego segmentu nazwy', () => {
    const { pivots, problems } = resolvePivots({ pivots: { '*/arrow': [11, 2.5] } }, ['fx/arrow']);
    expect(problems).toEqual([]);
    expect(pivots.get('fx/arrow')).toEqual([11, 2.5]);
  });
});
